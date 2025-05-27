import { type NextRequest, NextResponse } from 'next/server'
import { ScrapeJobQueue } from '@/lib/jobs/scrape-queue'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const queue = ScrapeJobQueue.getInstance()
    const job = await queue.getJobStatus(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Parse results if available
    let parsedResults = null
    if (job.results) {
      try {
        parsedResults = JSON.parse(job.results)
      } catch (e) {
        // Keep as string if can't parse
        parsedResults = job.results
      }
    }

    // Calculate duration if job has started
    let duration = null
    if (job.started_at) {
      const endTime = job.completed_at || new Date()
      duration = Math.round((endTime.getTime() - job.started_at.getTime()) / 1000) // seconds
    }

    return NextResponse.json({
      job: {
        id: job.id,
        job_type: job.job_type,
        status: job.status,
        priority: job.priority,
        retry_count: job.retry_count,
        max_retries: job.max_retries,
        target_url: job.target_url,
        zip_code: job.zip_code,
        property_id: job.property_id,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
        results: parsedResults,
        duration_seconds: duration
      }
    })

  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}