#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { ScrapingEngine } from '../server/services/ScrapingEngine';

const prisma = new PrismaClient();
const scrapingEngine = new ScrapingEngine();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/jobs.log' })
  ],
});

class JobProcessor {
  private isRunning = false;
  private processingJob = false;

  async start() {
    this.isRunning = true;
    logger.info('Job processor started');

    // Initialize scraping engine
    await scrapingEngine.initialize();

    // Process jobs continuously
    while (this.isRunning) {
      try {
        await this.processNextJob();
        await this.sleep(5000); // Wait 5 seconds between job checks
      } catch (error) {
        logger.error('Job processing error:', error);
        await this.sleep(10000); // Wait longer on error
      }
    }

    await scrapingEngine.shutdown();
    await prisma.$disconnect();
  }

  async stop() {
    logger.info('Stopping job processor...');
    this.isRunning = false;
    
    // Wait for current job to complete
    while (this.processingJob) {
      await this.sleep(1000);
    }
    
    logger.info('Job processor stopped');
  }

  private async processNextJob() {
    if (this.processingJob) return;

    // Get next pending job
    const job = await prisma.scrapeJob.findFirst({
      where: { 
        status: 'pending',
        retry_count: { lt: prisma.scrapeJob.fields.max_retries }
      },
      orderBy: [
        { priority: 'asc' },
        { created_at: 'asc' }
      ]
    });

    if (!job) return;

    this.processingJob = true;

    try {
      logger.info(`Processing job: ${job.id} (${job.job_type})`);

      // Mark job as running
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'running',
          started_at: new Date()
        }
      });

      // Execute the job
      const result = await scrapingEngine.executeJob({
        id: job.id,
        type: job.job_type as any,
        url: job.target_url || '',
        params: this.parseJobParams(job.results),
        priority: job.priority,
        retryCount: job.retry_count,
        maxRetries: job.max_retries
      });

      if (result.success) {
        logger.info(`Job completed successfully: ${job.id}`);
      } else {
        logger.error(`Job failed: ${job.id} - ${result.error}`);
      }

    } catch (error) {
      logger.error(`Job execution failed: ${job.id}`, error);
      
      // Mark job as failed
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date()
        }
      });
    } finally {
      this.processingJob = false;
    }
  }

  private parseJobParams(resultsJson: string | null): any {
    if (!resultsJson) return {};
    
    try {
      return JSON.parse(resultsJson);
    } catch {
      return {};
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const jobProcessor = new JobProcessor();

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await jobProcessor.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await jobProcessor.stop();
  process.exit(0);
});

// Start the job processor
jobProcessor.start().catch((error) => {
  logger.error('Failed to start job processor:', error);
  process.exit(1);
});