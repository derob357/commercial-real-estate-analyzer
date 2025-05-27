import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sources = [], // Array of sources: ['cbre', 'colliers', 'jll', 'cushman_wakefield']
      jobTypes = [], // Array of job types: ['properties', 'research', 'transactions', 'market_data']
      searchParams = {},
      priority = 2,
      schedule = null, // For future scheduling: { type: 'immediate', 'scheduled', 'recurring' }
      batchSize = 5 // Number of concurrent jobs
    } = body;

    // Validate inputs
    const validSources = ['cbre', 'colliers', 'jll', 'cushman_wakefield'];
    const validJobTypes = ['properties', 'research', 'transactions', 'market_data'];
    
    const filteredSources = sources.filter((source: string) => validSources.includes(source));
    const filteredJobTypes = jobTypes.filter((type: string) => validJobTypes.includes(type));

    if (filteredSources.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid source is required' },
        { status: 400 }
      );
    }

    if (filteredJobTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid job type is required' },
        { status: 400 }
      );
    }

    // Create scraping jobs for each source-jobType combination
    const jobs = [];
    for (const source of filteredSources) {
      for (const jobType of filteredJobTypes) {
        const job = await prisma.institutionalScrapeJob.create({
          data: {
            source,
            job_type: jobType,
            search_params: JSON.stringify(searchParams),
            priority,
            status: 'pending'
          }
        });
        jobs.push(job);
      }
    }

    // Initialize institutional scraping engine if needed
    // This would typically be handled by a background worker process
    // For now, we'll just create the jobs

    return NextResponse.json({
      success: true,
      message: `Created ${jobs.length} institutional scraping jobs`,
      jobs: jobs.map(job => ({
        id: job.id,
        source: job.source,
        jobType: job.job_type,
        status: job.status,
        priority: job.priority,
        createdAt: job.created_at
      })),
      batchInfo: {
        totalJobs: jobs.length,
        sources: filteredSources,
        jobTypes: filteredJobTypes,
        estimatedDuration: `${Math.ceil(jobs.length / batchSize) * 5} minutes`
      }
    });

  } catch (error) {
    console.error('Error creating institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to create scraping jobs' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const jobType = searchParams.get('jobType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (jobType) {
      where.job_type = jobType;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    // Get jobs with pagination
    const [jobs, totalCount] = await Promise.all([
      prisma.institutionalScrapeJob.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.institutionalScrapeJob.count({ where })
    ]);

    // Get job statistics
    const stats = await prisma.institutionalScrapeJob.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    const sourceStats = await prisma.institutionalScrapeJob.groupBy({
      by: ['source'],
      _count: {
        _all: true
      },
      _avg: {
        processing_time_ms: true,
        data_quality_score: true
      }
    });

    const jobTypeStats = await prisma.institutionalScrapeJob.groupBy({
      by: ['job_type'],
      _count: {
        _all: true
      },
      _avg: {
        results_count: true
      }
    });

    // Calculate performance metrics
    const performanceMetrics = await calculatePerformanceMetrics();

    // Format response
    const response = {
      jobs: jobs.map(job => ({
        ...job,
        search_params: job.search_params ? JSON.parse(job.search_params) : null,
        results: job.results ? JSON.parse(job.results) : null,
        validation_errors: job.validation_errors ? JSON.parse(job.validation_errors) : null,
        data_quality_score: job.data_quality_score ? Math.round(job.data_quality_score * 100) : null
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      },
      statistics: {
        byStatus: stats.map(item => ({
          status: item.status,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        })),
        bySource: sourceStats.map(item => ({
          source: item.source,
          count: item._count._all,
          avgProcessingTime: item._avg.processing_time_ms,
          avgDataQuality: item._avg.data_quality_score ? Math.round(item._avg.data_quality_score * 100) : null
        })),
        byJobType: jobTypeStats.map(item => ({
          jobType: item.job_type,
          count: item._count._all,
          avgResultsCount: item._avg.results_count
        }))
      },
      performance: performanceMetrics
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraping jobs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Job ID and action are required' },
        { status: 400 }
      );
    }

    let updatedJob;

    switch (action) {
      case 'cancel':
        updatedJob = await prisma.institutionalScrapeJob.update({
          where: { id: jobId },
          data: { status: 'cancelled' }
        });
        break;
      
      case 'retry':
        updatedJob = await prisma.institutionalScrapeJob.update({
          where: { id: jobId },
          data: { 
            status: 'pending',
            retry_count: { increment: 1 },
            error_message: null
          }
        });
        break;
      
      case 'reset':
        updatedJob = await prisma.institutionalScrapeJob.update({
          where: { id: jobId },
          data: { 
            status: 'pending',
            retry_count: 0,
            error_message: null,
            started_at: null,
            completed_at: null,
            processing_time_ms: null,
            results: null,
            results_count: 0
          }
        });
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Job ${action}ed successfully`,
      job: updatedJob
    });

  } catch (error) {
    console.error('Error updating institutional scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to update scraping job' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const deleteCompleted = searchParams.get('deleteCompleted') === 'true';
    const deleteOlderThan = searchParams.get('deleteOlderThan'); // In days

    if (jobId) {
      // Delete specific job
      await prisma.institutionalScrapeJob.delete({
        where: { id: jobId }
      });

      return NextResponse.json({
        success: true,
        message: 'Job deleted successfully'
      });
    }

    if (deleteCompleted || deleteOlderThan) {
      // Bulk delete operations
      const where: any = {};

      if (deleteCompleted) {
        where.status = 'completed';
      }

      if (deleteOlderThan) {
        const daysAgo = parseInt(deleteOlderThan);
        where.created_at = {
          lt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        };
      }

      const result = await prisma.institutionalScrapeJob.deleteMany({
        where
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} jobs`
      });
    }

    return NextResponse.json(
      { error: 'No deletion criteria specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error deleting institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to delete scraping jobs' },
      { status: 500 }
    );
  }
}

async function calculatePerformanceMetrics() {
  try {
    // Get performance data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentJobs = await prisma.institutionalScrapeJob.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        },
        status: {
          in: ['completed', 'failed']
        }
      }
    });

    const completedJobs = recentJobs.filter(job => job.status === 'completed');
    const failedJobs = recentJobs.filter(job => job.status === 'failed');

    const successRate = recentJobs.length > 0 ? (completedJobs.length / recentJobs.length) * 100 : 0;
    
    const avgProcessingTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.processing_time_ms || 0), 0) / completedJobs.length
      : 0;

    const avgDataQuality = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.data_quality_score || 0), 0) / completedJobs.length
      : 0;

    const totalRecordsScraped = completedJobs.reduce((sum, job) => sum + (job.results_count || 0), 0);

    return {
      successRate: Math.round(successRate),
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      avgDataQualityScore: Math.round(avgDataQuality * 100),
      totalJobsLast30Days: recentJobs.length,
      completedJobsLast30Days: completedJobs.length,
      failedJobsLast30Days: failedJobs.length,
      totalRecordsScraped,
      avgRecordsPerJob: completedJobs.length > 0 ? Math.round(totalRecordsScraped / completedJobs.length) : 0
    };

  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return {
      successRate: 0,
      avgProcessingTimeMs: 0,
      avgDataQualityScore: 0,
      totalJobsLast30Days: 0,
      completedJobsLast30Days: 0,
      failedJobsLast30Days: 0,
      totalRecordsScraped: 0,
      avgRecordsPerJob: 0
    };
  }
}