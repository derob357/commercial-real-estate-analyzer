import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';

const router = express.Router();

/**
 * GET /api/scraping/jobs
 * Get scraping jobs with filtering and pagination
 */
router.get('/jobs', async (req, res) => {
  try {
    const {
      status,
      job_type,
      limit = 50,
      offset = 0
    } = req.query;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (job_type) {
      whereClause.job_type = job_type;
    }

    const jobs = await prisma.scrapeJob.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.scrapeJob.count({ where: whereClause });

    // Calculate statistics
    const stats = await prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    res.json({
      jobs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: (Number(offset) + Number(limit)) < total
      },
      statistics: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as any)
    });

  } catch (error) {
    logger.error('Scraping jobs retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve scraping jobs' });
  }
});

/**
 * GET /api/scraping/status
 * Get overall scraping system status
 */
router.get('/status', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get job counts by status
    const jobStats = await prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    // Get recent job performance
    const recentJobs = await prisma.scrapeJob.findMany({
      where: {
        created_at: { gte: last24Hours }
      },
      select: {
        status: true,
        job_type: true,
        created_at: true,
        completed_at: true
      }
    });

    // Calculate success rate
    const completedJobs = recentJobs.filter(job => job.status === 'completed');
    const failedJobs = recentJobs.filter(job => job.status === 'failed');
    const successRate = recentJobs.length > 0 
      ? (completedJobs.length / recentJobs.length) * 100 
      : 0;

    // Get queue depth
    const queueDepth = await prisma.scrapeJob.count({
      where: { status: 'pending' }
    });

    res.json({
      system_status: 'operational',
      queue_depth: queueDepth,
      success_rate: Math.round(successRate * 100) / 100,
      last_24_hours: {
        total_jobs: recentJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        pending: recentJobs.filter(job => job.status === 'pending').length
      },
      job_statistics: jobStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as any),
      generated_at: now.toISOString()
    });

  } catch (error) {
    logger.error('Scraping status retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve scraping status' });
  }
});

/**
 * POST /api/scraping/queue
 * Queue a new scraping job
 */
router.post('/queue', async (req, res) => {
  try {
    const {
      job_type,
      target_url,
      zip_code,
      property_id,
      priority = 3,
      params
    } = req.body;

    const job = await prisma.scrapeJob.create({
      data: {
        job_type,
        target_url,
        zip_code,
        property_id,
        status: 'pending',
        priority,
        max_retries: 3,
        // Store additional parameters as JSON
        ...(params && { results: JSON.stringify(params) })
      }
    });

    logger.info(`Scraping job queued: ${job_type} - ${job.id}`);

    res.json({
      success: true,
      job_id: job.id,
      message: 'Scraping job queued successfully'
    });

  } catch (error) {
    logger.error('Failed to queue scraping job:', error);
    res.status(400).json({ error: 'Failed to queue scraping job' });
  }
});

/**
 * DELETE /api/scraping/job/:job_id
 * Cancel a pending scraping job
 */
router.delete('/job/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    const job = await prisma.scrapeJob.findUnique({
      where: { id: job_id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'running') {
      return res.status(400).json({ error: 'Cannot cancel running job' });
    }

    if (job.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed job' });
    }

    await prisma.scrapeJob.update({
      where: { id: job_id },
      data: {
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    logger.error('Failed to cancel scraping job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

/**
 * POST /api/scraping/retry/:job_id
 * Retry a failed scraping job
 */
router.post('/retry/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    const job = await prisma.scrapeJob.findUnique({
      where: { id: job_id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({ error: 'Can only retry failed jobs' });
    }

    if (job.retry_count >= job.max_retries) {
      return res.status(400).json({ error: 'Maximum retries exceeded' });
    }

    await prisma.scrapeJob.update({
      where: { id: job_id },
      data: {
        status: 'pending',
        retry_count: { increment: 1 },
        error_message: null,
        started_at: null,
        completed_at: null
      }
    });

    res.json({
      success: true,
      message: 'Job queued for retry'
    });

  } catch (error) {
    logger.error('Failed to retry scraping job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

/**
 * GET /api/scraping/data-sources
 * Get configured data sources
 */
router.get('/data-sources', async (req, res) => {
  try {
    const { type, is_active } = req.query;

    const whereClause: any = {};

    if (type) {
      whereClause.type = type;
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const dataSources = await prisma.dataSource.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    res.json({
      data_sources: dataSources,
      total: dataSources.length
    });

  } catch (error) {
    logger.error('Data sources retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve data sources' });
  }
});

export default router;