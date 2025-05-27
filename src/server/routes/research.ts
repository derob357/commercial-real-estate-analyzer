import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';

const router = express.Router();

/**
 * GET /api/research/reports
 * Get market research reports with filtering
 */
router.get('/reports', async (req, res) => {
  try {
    const {
      metro_area,
      property_type,
      source,
      from_date,
      to_date,
      limit = 20,
      offset = 0
    } = req.query;

    const whereClause: any = {};

    if (metro_area) {
      whereClause.metro_area = { contains: metro_area as string, mode: 'insensitive' };
    }

    if (property_type) {
      whereClause.property_type = property_type;
    }

    if (source) {
      whereClause.source = source;
    }

    if (from_date || to_date) {
      whereClause.publication_date = {};
      if (from_date) {
        whereClause.publication_date.gte = new Date(from_date as string);
      }
      if (to_date) {
        whereClause.publication_date.lte = new Date(to_date as string);
      }
    }

    const reports = await prisma.researchReport.findMany({
      where: whereClause,
      orderBy: { publication_date: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.researchReport.count({ where: whereClause });

    res.json({
      reports,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: (Number(offset) + Number(limit)) < total
      }
    });

  } catch (error) {
    logger.error('Research reports retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve research reports' });
  }
});

/**
 * GET /api/research/economic-indicators/:metro_area
 * Get economic indicators for a metro area
 */
router.get('/economic-indicators/:metro_area', async (req, res) => {
  try {
    const { metro_area } = req.params;
    const { indicators, months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const whereClause: any = {
      metro_area: { contains: metro_area, mode: 'insensitive' },
      measurement_date: { gte: startDate }
    };

    if (indicators) {
      const indicatorList = (indicators as string).split(',');
      whereClause.indicator_type = { in: indicatorList };
    }

    const economicData = await prisma.economicIndicator.findMany({
      where: whereClause,
      orderBy: [
        { indicator_type: 'asc' },
        { measurement_date: 'desc' }
      ]
    });

    // Group by indicator type
    const groupedData: any = {};
    economicData.forEach(indicator => {
      if (!groupedData[indicator.indicator_type]) {
        groupedData[indicator.indicator_type] = [];
      }
      groupedData[indicator.indicator_type].push(indicator);
    });

    res.json({
      metro_area,
      indicators: groupedData,
      data_points: economicData.length,
      date_range: {
        from: startDate,
        to: new Date()
      }
    });

  } catch (error) {
    logger.error('Economic indicators retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve economic indicators' });
  }
});

/**
 * GET /api/research/report/:id
 * Get specific research report
 */
router.get('/report/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.researchReport.findUnique({
      where: { id }
    });

    if (!report) {
      return res.status(404).json({ error: 'Research report not found' });
    }

    res.json(report);

  } catch (error) {
    logger.error('Research report retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve research report' });
  }
});

export default router;