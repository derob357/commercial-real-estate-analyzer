import { PrismaClient } from '@prisma/client';
import { InstitutionalScrapers, InstitutionalScrapingJob } from './InstitutionalScrapers';
import { InstitutionalDataNormalizer } from '../utils/InstitutionalDataNormalizer';
import { logger } from '../index';
import cron from 'node-cron';

export interface JobProcessorConfig {
  maxConcurrentJobs: number;
  batchSize: number;
  retryDelayMs: number;
  maxRetries: number;
  scheduledRunTimes: string[]; // Cron expressions
  enableScheduling: boolean;
}

export interface ProcessingMetrics {
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  dataQualityScore: number;
  recordsScraped: number;
}

export class InstitutionalJobProcessor {
  private prisma: PrismaClient;
  private scrapers: InstitutionalScrapers;
  private normalizer: InstitutionalDataNormalizer;
  private config: JobProcessorConfig;
  private isProcessing: boolean = false;
  private activeJobs: Set<string> = new Set();
  private scheduledTasks: cron.ScheduledTask[] = [];
  private metrics: ProcessingMetrics = {
    jobsProcessed: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    dataQualityScore: 0,
    recordsScraped: 0
  };

  constructor(config?: Partial<JobProcessorConfig>) {
    this.prisma = new PrismaClient();
    this.scrapers = new InstitutionalScrapers();
    this.normalizer = new InstitutionalDataNormalizer();
    
    // Default configuration
    this.config = {
      maxConcurrentJobs: 3,
      batchSize: 10,
      retryDelayMs: 60000, // 1 minute
      maxRetries: 3,
      scheduledRunTimes: [
        '0 6 * * *',  // 6 AM daily
        '0 18 * * *'  // 6 PM daily
      ],
      enableScheduling: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.scrapers.initialize();
      
      if (this.config.enableScheduling) {
        this.setupScheduledJobs();
      }
      
      logger.info('Institutional job processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize institutional job processor:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Stop scheduled tasks
      this.scheduledTasks.forEach(task => task.stop());
      this.scheduledTasks = [];
      
      // Wait for active jobs to complete (with timeout)
      const timeout = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (this.activeJobs.size > 0 && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (this.activeJobs.size > 0) {
        logger.warn(`Shutting down with ${this.activeJobs.size} active jobs`);
      }
      
      await this.scrapers.shutdown();
      await this.prisma.$disconnect();
      
      logger.info('Institutional job processor shut down successfully');
    } catch (error) {
      logger.error('Error shutting down institutional job processor:', error);
      throw error;
    }
  }

  /**
   * Start processing jobs from the queue
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Job processor is already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting institutional job processor');

    try {
      while (this.isProcessing) {
        await this.processBatch();
        
        // Wait before next batch
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      logger.error('Error in job processing loop:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Stop processing jobs
   */
  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    logger.info('Stopping institutional job processor');
  }

  /**
   * Process a batch of jobs
   */
  private async processBatch(): Promise<void> {
    try {
      // Get pending jobs
      const pendingJobs = await this.getPendingJobs();
      
      if (pendingJobs.length === 0) {
        return;
      }

      logger.info(`Processing batch of ${pendingJobs.length} jobs`);

      // Process jobs with concurrency limit
      const batches = this.chunkArray(pendingJobs, this.config.maxConcurrentJobs);
      
      for (const batch of batches) {
        const promises = batch.map(job => this.processJob(job));
        await Promise.allSettled(promises);
      }

    } catch (error) {
      logger.error('Error processing job batch:', error);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(jobData: any): Promise<void> {
    const jobId = jobData.id;
    
    try {
      this.activeJobs.add(jobId);
      
      // Update job status to running
      await this.prisma.institutionalScrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          started_at: new Date()
        }
      });

      // Create scraping job object
      const scrapingJob: InstitutionalScrapingJob = {
        id: jobData.id,
        source: jobData.source,
        jobType: jobData.job_type,
        url: this.buildJobUrl(jobData),
        searchParams: jobData.search_params ? JSON.parse(jobData.search_params) : {},
        priority: jobData.priority,
        retryCount: jobData.retry_count,
        maxRetries: jobData.max_retries
      };

      // Execute the job
      const startTime = Date.now();
      const result = await this.scrapers.executeJob(scrapingJob);
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(result, processingTime);

      if (result.success) {
        // Normalize and validate data
        await this.processScrapedData(result.data, jobData.source, jobData.job_type);
        
        // Generate quality report
        if (result.data && Array.isArray(result.data)) {
          await this.normalizer.generateQualityReport(
            jobData.source,
            jobData.job_type,
            result.data
          );
        }

        logger.info(`Job ${jobId} completed successfully`);
      } else {
        logger.error(`Job ${jobId} failed: ${result.error}`);
        
        // Handle retry logic
        await this.handleJobFailure(jobData, result.error);
      }

    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);
      await this.handleJobFailure(jobData, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Get pending jobs from the database
   */
  private async getPendingJobs(): Promise<any[]> {
    try {
      // Get jobs that are ready to be processed
      const jobs = await this.prisma.institutionalScrapeJob.findMany({
        where: {
          status: 'pending',
          retry_count: {
            lt: this.config.maxRetries
          }
        },
        orderBy: [
          { priority: 'asc' },
          { created_at: 'asc' }
        ],
        take: this.config.batchSize
      });

      return jobs;
    } catch (error) {
      logger.error('Error fetching pending jobs:', error);
      return [];
    }
  }

  /**
   * Handle job failure and retry logic
   */
  private async handleJobFailure(jobData: any, errorMessage: string): Promise<void> {
    try {
      const shouldRetry = jobData.retry_count < this.config.maxRetries;
      
      if (shouldRetry) {
        // Schedule retry with delay
        const retryAt = new Date(Date.now() + this.config.retryDelayMs);
        
        await this.prisma.institutionalScrapeJob.update({
          where: { id: jobData.id },
          data: {
            status: 'pending',
            retry_count: { increment: 1 },
            error_message: errorMessage,
            // Note: In a real implementation, you'd want a scheduled_at field
          }
        });

        logger.info(`Job ${jobData.id} scheduled for retry ${jobData.retry_count + 1}/${this.config.maxRetries}`);
      } else {
        // Mark as failed
        await this.prisma.institutionalScrapeJob.update({
          where: { id: jobData.id },
          data: {
            status: 'failed',
            completed_at: new Date(),
            error_message: errorMessage
          }
        });

        logger.warn(`Job ${jobData.id} failed permanently after ${this.config.maxRetries} retries`);
      }
    } catch (error) {
      logger.error(`Error handling job failure for ${jobData.id}:`, error);
    }
  }

  /**
   * Process and normalize scraped data
   */
  private async processScrapedData(data: any, source: string, jobType: string): Promise<void> {
    try {
      if (!data || !Array.isArray(data)) {
        return;
      }

      switch (jobType) {
        case 'properties':
          for (const item of data) {
            const result = await this.normalizer.normalizeProperty(item, source);
            if (result.validation.isValid) {
              await this.saveInstitutionalProperty(result.data);
            } else {
              logger.warn(`Invalid property data from ${source}:`, result.validation.errors);
            }
          }
          break;

        case 'research':
          for (const item of data) {
            const result = await this.normalizer.normalizeResearchReport(item, source);
            if (result.validation.isValid) {
              await this.saveResearchReport(result.data);
            } else {
              logger.warn(`Invalid research report from ${source}:`, result.validation.errors);
            }
          }
          break;

        case 'transactions':
          for (const item of data) {
            const result = await this.normalizer.normalizeTransaction(item, source);
            if (result.validation.isValid) {
              await this.saveTransaction(result.data);
            } else {
              logger.warn(`Invalid transaction data from ${source}:`, result.validation.errors);
            }
          }
          break;

        case 'market_data':
          // Market data is typically a single object, not an array
          const result = await this.normalizer.normalizeProperty(data, source);
          if (result.validation.isValid) {
            await this.saveMarketData(result.data);
          }
          break;
      }
    } catch (error) {
      logger.error(`Error processing scraped data from ${source}:`, error);
    }
  }

  /**
   * Build job URL based on source and search parameters
   */
  private buildJobUrl(jobData: any): string {
    const baseUrls = {
      cbre: 'https://www.cbre.com',
      colliers: 'https://www.colliers.com',
      jll: 'https://www.jll.com/en-us',
      cushman_wakefield: 'https://www.cushmanwakefield.com/en/united-states'
    };

    const baseUrl = baseUrls[jobData.source as keyof typeof baseUrls];
    
    // Build specific URLs based on job type
    switch (jobData.job_type) {
      case 'properties':
        return `${baseUrl}/properties`;
      case 'research':
        return `${baseUrl}/insights`;
      case 'transactions':
        return `${baseUrl}/transactions`;
      case 'market_data':
        return `${baseUrl}/market-data`;
      default:
        return baseUrl;
    }
  }

  /**
   * Setup scheduled jobs
   */
  private setupScheduledJobs(): void {
    try {
      this.config.scheduledRunTimes.forEach((cronExpression, index) => {
        const task = cron.schedule(cronExpression, async () => {
          logger.info(`Running scheduled institutional scraping (schedule ${index + 1})`);
          await this.createScheduledJobs();
        }, {
          scheduled: false
        });

        this.scheduledTasks.push(task);
        task.start();
        
        logger.info(`Scheduled institutional scraping: ${cronExpression}`);
      });
    } catch (error) {
      logger.error('Error setting up scheduled jobs:', error);
    }
  }

  /**
   * Create jobs for scheduled runs
   */
  private async createScheduledJobs(): Promise<void> {
    try {
      const sources = ['cbre', 'colliers', 'jll', 'cushman_wakefield'];
      const jobTypes = ['properties', 'research', 'transactions', 'market_data'];

      for (const source of sources) {
        for (const jobType of jobTypes) {
          await this.prisma.institutionalScrapeJob.create({
            data: {
              source,
              job_type: jobType,
              priority: 3, // Lower priority for scheduled jobs
              status: 'pending'
            }
          });
        }
      }

      logger.info(`Created ${sources.length * jobTypes.length} scheduled jobs`);
    } catch (error) {
      logger.error('Error creating scheduled jobs:', error);
    }
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(result: any, processingTime: number): void {
    this.metrics.jobsProcessed++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.jobsProcessed;

    if (result.success) {
      this.metrics.jobsSucceeded++;
      
      if (result.metadata?.recordCount) {
        this.metrics.recordsScraped += result.metadata.recordCount;
      }
      
      if (result.metadata?.dataQualityScore) {
        // Running average of data quality scores
        const currentAvg = this.metrics.dataQualityScore;
        const newAvg = (currentAvg * (this.metrics.jobsSucceeded - 1) + result.metadata.dataQualityScore) / this.metrics.jobsSucceeded;
        this.metrics.dataQualityScore = newAvg;
      }
    } else {
      this.metrics.jobsFailed++;
    }
  }

  /**
   * Get current processing metrics
   */
  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      dataQualityScore: 0,
      recordsScraped: 0
    };
  }

  // Database save methods (simplified - in real implementation these would be more robust)
  private async saveInstitutionalProperty(data: any): Promise<void> {
    try {
      await this.prisma.institutionalProperty.upsert({
        where: {
          source_property_id: {
            source: data.source,
            property_id: data.property_id || `${data.source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        },
        update: data,
        create: data
      });
    } catch (error) {
      logger.error('Error saving institutional property:', error);
    }
  }

  private async saveResearchReport(data: any): Promise<void> {
    try {
      await this.prisma.marketResearchReport.upsert({
        where: {
          source_title_publication_date: {
            source: data.source,
            title: data.title,
            publication_date: data.publication_date
          }
        },
        update: data,
        create: data
      });
    } catch (error) {
      logger.error('Error saving research report:', error);
    }
  }

  private async saveTransaction(data: any): Promise<void> {
    try {
      await this.prisma.institutionalTransaction.upsert({
        where: {
          source_property_address_sale_date: {
            source: data.source,
            property_address: data.property_address,
            sale_date: data.sale_date
          }
        },
        update: data,
        create: data
      });
    } catch (error) {
      logger.error('Error saving transaction:', error);
    }
  }

  private async saveMarketData(data: any): Promise<void> {
    try {
      await this.prisma.institutionalMarketData.create({
        data: {
          ...data,
          measurement_date: new Date()
        }
      });
    } catch (error) {
      logger.error('Error saving market data:', error);
    }
  }

  // Utility methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}