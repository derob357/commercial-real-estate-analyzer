import cron from 'node-cron'
import { prisma } from '../database'
import { TaxAssessorScraper } from '../tax-assessor/scraper'
import { TaxAssessorMapper } from '../tax-assessor/mapping'

export interface ScrapeJob {
  id: string
  jobType: 'tax_assessor' | 'property_listing' | 'market_data'
  targetUrl?: string
  zipCode?: string
  propertyId?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  retryCount: number
  maxRetries: number
}

export class ScrapeJobQueue {
  private static instance: ScrapeJobQueue
  private isProcessing = false
  private concurrentLimit: number
  private activeJobs = new Set<string>()

  constructor() {
    this.concurrentLimit = Number.parseInt(process.env.SCRAPING_CONCURRENT_JOBS || '5')
  }

  static getInstance(): ScrapeJobQueue {
    if (!ScrapeJobQueue.instance) {
      ScrapeJobQueue.instance = new ScrapeJobQueue()
    }
    return ScrapeJobQueue.instance
  }

  // Add a job to the queue
  async addJob(
    jobType: 'tax_assessor' | 'property_listing' | 'market_data',
    options: {
      targetUrl?: string
      zipCode?: string
      propertyId?: string
      priority?: number
      maxRetries?: number
    }
  ): Promise<string> {
    const job = await prisma.scrapeJob.create({
      data: {
        job_type: jobType,
        target_url: options.targetUrl,
        zip_code: options.zipCode,
        property_id: options.propertyId,
        status: 'pending',
        priority: options.priority || 3,
        max_retries: options.maxRetries || 3,
        retry_count: 0
      }
    })

    console.log(`Added ${jobType} job ${job.id} to queue`)

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return job.id
  }

  // Add multiple tax assessor jobs for properties that need updates
  async addTaxAssessorJobs(maxJobs = 50): Promise<string[]> {
    // Find properties that need tax data updates
    const staleProperties = await prisma.property.findMany({
      where: {
        OR: [
          { last_tax_update: null },
          { 
            last_tax_update: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
            }
          }
        ],
        zip_code: { not: null }
      },
      take: maxJobs,
      orderBy: [
        { last_tax_update: 'asc' }, // Oldest first
        { created_at: 'desc' }      // Then newest
      ]
    })

    const jobIds: string[] = []

    for (const property of staleProperties) {
      // Check if tax assessor is available for this ZIP code
      const assessor = await TaxAssessorMapper.getAssessorForZipCode(property.zip_code)
      
      if (assessor && assessor.is_active) {
        const jobId = await this.addJob('tax_assessor', {
          propertyId: property.id,
          zipCode: property.zip_code,
          priority: 2 // Medium priority for bulk updates
        })
        jobIds.push(jobId)
      }
    }

    console.log(`Added ${jobIds.length} tax assessor jobs for stale properties`)
    return jobIds
  }

  // Process the job queue
  async processQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log('Starting job queue processing...')

    try {
      while (true) {
        // Check if we've reached concurrent limit
        if (this.activeJobs.size >= this.concurrentLimit) {
          await this.sleep(5000) // Wait 5 seconds
          continue
        }

        // Get next job
        const job = await prisma.scrapeJob.findFirst({
          where: { status: 'pending' },
          orderBy: [
            { priority: 'asc' },    // Lower number = higher priority
            { created_at: 'asc' }   // FIFO for same priority
          ]
        })

        if (!job) {
          // No pending jobs, wait a bit then check again
          await this.sleep(10000) // Wait 10 seconds
          continue
        }

        // Process the job
        this.processJob(job)
      }
    } catch (error) {
      console.error('Job queue processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process an individual job
  private async processJob(job: any): Promise<void> {
    const jobId = job.id
    this.activeJobs.add(jobId)

    try {
      // Mark job as running
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: { 
          status: 'running',
          started_at: new Date()
        }
      })

      console.log(`Processing ${job.job_type} job ${jobId}`)

      let success = false
      let errorMessage = ''

      switch (job.job_type) {
        case 'tax_assessor':
          ({ success, errorMessage } = await this.processTaxAssessorJob(job))
          break
        case 'property_listing':
          ({ success, errorMessage } = await this.processPropertyListingJob(job))
          break
        case 'market_data':
          ({ success, errorMessage } = await this.processMarketDataJob(job))
          break
        default:
          success = false
          errorMessage = `Unknown job type: ${job.job_type}`
      }

      // Update job status
      if (success) {
        await prisma.scrapeJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completed_at: new Date()
          }
        })
        console.log(`Completed job ${jobId}`)
      } else {
        // Handle failure
        const newRetryCount = job.retry_count + 1
        
        if (newRetryCount <= job.max_retries) {
          // Retry the job
          await prisma.scrapeJob.update({
            where: { id: jobId },
            data: {
              status: 'pending',
              retry_count: newRetryCount,
              error_message: errorMessage,
              started_at: null
            }
          })
          console.log(`Retrying job ${jobId} (attempt ${newRetryCount}/${job.max_retries})`)
        } else {
          // Mark as failed
          await prisma.scrapeJob.update({
            where: { id: jobId },
            data: {
              status: 'failed',
              completed_at: new Date(),
              error_message: errorMessage
            }
          })
          console.log(`Failed job ${jobId}: ${errorMessage}`)
        }
      }

    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error)
      
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completed_at: new Date(),
          error_message: `Processing error: ${error}`
        }
      })
    } finally {
      this.activeJobs.delete(jobId)
    }
  }

  private async processTaxAssessorJob(job: any): Promise<{ success: boolean; errorMessage: string }> {
    try {
      if (!job.property_id && !job.zip_code) {
        return { success: false, errorMessage: 'Property ID or ZIP code required for tax assessor job' }
      }

      const scraper = new TaxAssessorScraper()
      let scrapeResult

      if (job.property_id) {
        // Get property details
        const property = await prisma.property.findUnique({
          where: { id: job.property_id }
        })

        if (!property) {
          return { success: false, errorMessage: 'Property not found' }
        }

        scrapeResult = await scraper.scrapeByZipCode(property.zip_code, property.address)
        
        if (scrapeResult.success && scrapeResult.data) {
          await scraper.saveTaxData(property.id, scrapeResult.data)
        }
      } else if (job.zip_code) {
        // Generic ZIP code scraping (for testing assessor availability)
        scrapeResult = await scraper.scrapeByZipCode(job.zip_code, '123 Main St') // Test address
      }

      await scraper.closeBrowser()

      if (scrapeResult?.success) {
        // Save results to job record
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            results: JSON.stringify(scrapeResult.data)
          }
        })
        return { success: true, errorMessage: '' }
      } else {
        return { success: false, errorMessage: scrapeResult?.error || 'Unknown scraping error' }
      }

    } catch (error) {
      return { success: false, errorMessage: `Tax assessor job error: ${error}` }
    }
  }

  private async processPropertyListingJob(job: any): Promise<{ success: boolean; errorMessage: string }> {
    // Placeholder for property listing scraping
    // This would scrape LoopNet, Crexi, etc.
    console.log('Property listing job not implemented yet')
    return { success: false, errorMessage: 'Property listing scraping not implemented' }
  }

  private async processMarketDataJob(job: any): Promise<{ success: boolean; errorMessage: string }> {
    // Placeholder for market data scraping
    // This would scrape market reports, comparable sales, etc.
    console.log('Market data job not implemented yet')
    return { success: false, errorMessage: 'Market data scraping not implemented' }
  }

  // Get job status
  async getJobStatus(jobId: string) {
    return await prisma.scrapeJob.findUnique({
      where: { id: jobId }
    })
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = await prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: true
    })

    const result: { [status: string]: number } = {}
    stats.forEach(stat => {
      result[stat.status] = stat._count
    })

    return {
      ...result,
      active_jobs: this.activeJobs.size,
      concurrent_limit: this.concurrentLimit
    }
  }

  // Clean up old jobs
  async cleanupOldJobs(daysOld = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
    
    const result = await prisma.scrapeJob.deleteMany({
      where: {
        created_at: { lt: cutoffDate },
        status: { in: ['completed', 'failed'] }
      }
    })

    console.log(`Cleaned up ${result.count} old jobs`)
    return result.count
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Stop processing (graceful shutdown)
  stop(): void {
    this.isProcessing = false
    console.log('Job queue processing stopped')
  }
}

// Scheduled jobs using cron
export class ScheduledJobs {
  private static instance: ScheduledJobs
  private jobs: cron.ScheduledTask[] = []

  static getInstance(): ScheduledJobs {
    if (!ScheduledJobs.instance) {
      ScheduledJobs.instance = new ScheduledJobs()
    }
    return ScheduledJobs.instance
  }

  start(): void {
    const queue = ScrapeJobQueue.getInstance()

    // Daily tax assessor updates at 2 AM
    const dailyTaxUpdate = cron.schedule('0 2 * * *', async () => {
      console.log('Running daily tax assessor update job')
      await queue.addTaxAssessorJobs(100)
    }, { scheduled: false })

    // Weekly cleanup at 3 AM on Sundays
    const weeklyCleanup = cron.schedule('0 3 * * 0', async () => {
      console.log('Running weekly job cleanup')
      await queue.cleanupOldJobs(7)
    }, { scheduled: false })

    // Start all jobs
    dailyTaxUpdate.start()
    weeklyCleanup.start()

    this.jobs.push(dailyTaxUpdate, weeklyCleanup)
    console.log('Scheduled jobs started')
  }

  stop(): void {
    this.jobs.forEach(job => job.stop())
    this.jobs = []
    console.log('Scheduled jobs stopped')
  }
}

// Initialize and start the job system
export async function initializeJobSystem(): Promise<void> {
  try {
    // Initialize tax assessor database
    await TaxAssessorMapper.initializeDatabase()
    
    // Start the job queue
    const queue = ScrapeJobQueue.getInstance()
    queue.processQueue()
    
    // Start scheduled jobs
    const scheduler = ScheduledJobs.getInstance()
    scheduler.start()
    
    console.log('Job system initialized successfully')
  } catch (error) {
    console.error('Failed to initialize job system:', error)
    throw error
  }
}