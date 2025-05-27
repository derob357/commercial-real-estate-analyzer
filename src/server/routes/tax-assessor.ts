import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Validation schemas
const taxLookupSchema = z.object({
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().length(2),
  zip_code: z.string().min(5),
  property_id: z.string().optional(),
  force_refresh: z.boolean().default(false)
});

/**
 * POST /api/tax-assessor/lookup
 * Look up tax assessment data for a property
 */
router.post('/lookup', async (req, res) => {
  try {
    const lookupParams = taxLookupSchema.parse(req.body);
    
    // Check if we already have recent tax data
    let existingData = null;
    if (lookupParams.property_id && !lookupParams.force_refresh) {
      existingData = await prisma.taxAssessment.findFirst({
        where: { 
          property_id: lookupParams.property_id,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { assessment_year: 'desc' }
      });
    }

    if (existingData) {
      return res.json({
        success: true,
        data: existingData,
        cached: true
      });
    }

    // Find tax assessor configuration
    const zipMapping = await prisma.zipCodeMapping.findUnique({
      where: { zip_code: lookupParams.zip_code }
    });

    if (!zipMapping) {
      return res.status(404).json({ 
        error: 'County mapping not found for zip code',
        zip_code: lookupParams.zip_code 
      });
    }

    const assessorConfig = await prisma.taxAssessorSource.findFirst({
      where: { 
        county: zipMapping.county,
        state: zipMapping.state,
        is_active: true 
      }
    });

    if (!assessorConfig) {
      return res.status(404).json({ 
        error: 'Tax assessor configuration not found',
        county: zipMapping.county,
        state: zipMapping.state 
      });
    }

    // Create and queue scraping job
    const jobId = uuidv4();
    await prisma.scrapeJob.create({
      data: {
        id: jobId,
        job_type: 'tax_assessor',
        target_url: assessorConfig.assessor_url,
        property_id: lookupParams.property_id,
        zip_code: lookupParams.zip_code,
        status: 'pending',
        priority: 1,
        max_retries: 3
      }
    });

    res.json({
      success: true,
      job_id: jobId,
      status: 'queued',
      message: 'Tax assessment lookup queued for processing'
    });

  } catch (error) {
    logger.error('Tax lookup validation failed:', error);
    res.status(400).json({ error: 'Invalid lookup parameters' });
  }
});

/**
 * GET /api/tax-assessor/:property_id/history
 * Get tax assessment history for a property
 */
router.get('/:property_id/history', async (req, res) => {
  try {
    const { property_id } = req.params;
    const { years = 5 } = req.query;

    const assessments = await prisma.taxAssessment.findMany({
      where: { property_id },
      orderBy: { assessment_year: 'desc' },
      take: Number(years)
    });

    const payments = await prisma.taxPayment.findMany({
      where: { property_id },
      orderBy: { tax_year: 'desc' },
      take: Number(years)
    });

    res.json({
      property_id,
      assessments,
      payments,
      years_of_data: assessments.length
    });

  } catch (error) {
    logger.error('Tax history retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve tax history' });
  }
});

/**
 * GET /api/tax-assessor/status/:job_id
 * Get status of a tax assessment scraping job
 */
router.get('/status/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    const job = await prisma.scrapeJob.findUnique({
      where: { id: job_id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let result = null;
    if (job.status === 'completed' && job.results) {
      try {
        result = JSON.parse(job.results);
      } catch (error) {
        logger.error('Failed to parse job results:', error);
      }
    }

    res.json({
      job_id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error_message: job.error_message,
      result
    });

  } catch (error) {
    logger.error('Job status retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve job status' });
  }
});

export default router;