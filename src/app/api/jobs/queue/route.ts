import { type NextRequest, NextResponse } from 'next/server'
import { ScrapeJobQueue } from '@/lib/jobs/scrape-queue'

// GET - Get queue status and statistics
export async function GET(request: NextRequest) {
  try {
    const queue = ScrapeJobQueue.getInstance()
    const stats = await queue.getQueueStats()
    
    return NextResponse.json({
      queue_status: 'active',
      statistics: stats,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      { error: 'Failed to get queue statistics' },
      { status: 500 }
    )
  }
}

// POST - Add jobs to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_type, options = {}, bulk_operation } = body

    if (!job_type || !['tax_assessor', 'property_listing', 'market_data'].includes(job_type)) {
      return NextResponse.json(
        { error: 'Valid job_type is required (tax_assessor, property_listing, market_data)' },
        { status: 400 }
      )
    }

    const queue = ScrapeJobQueue.getInstance()
    let jobIds: string[]

    if (bulk_operation === 'tax_assessor_bulk') {
      // Add bulk tax assessor jobs for stale properties
      const maxJobs = options.max_jobs || 50
      jobIds = await queue.addTaxAssessorJobs(maxJobs)
    } else {
      // Add single job
      const jobId = await queue.addJob(job_type, options)
      jobIds = [jobId]
    }

    return NextResponse.json({
      success: true,
      jobs_created: jobIds.length,
      job_ids: jobIds
    })

  } catch (error) {
    console.error('Error adding jobs to queue:', error)
    return NextResponse.json(
      { error: 'Failed to add jobs to queue' },
      { status: 500 }
    )
  }
}

// DELETE - Clean up old jobs
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysOld = Number.parseInt(searchParams.get('days_old') || '7')

    const queue = ScrapeJobQueue.getInstance()
    const deletedCount = await queue.cleanupOldJobs(daysOld)

    return NextResponse.json({
      success: true,
      deleted_jobs: deletedCount,
      days_old: daysOld
    })

  } catch (error) {
    console.error('Error cleaning up jobs:', error)
    return NextResponse.json(
      { error: 'Failed to clean up jobs' },
      { status: 500 }
    )
  }
}