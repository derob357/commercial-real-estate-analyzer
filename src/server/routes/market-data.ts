import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';

const router = express.Router();

// Validation schemas
const marketDataQuerySchema = z.object({
  zip_code: z.string().optional(),
  metro_area: z.string().optional(),
  region: z.string().optional(),
  state: z.string().optional(),
  data_source: z.enum(['realtyrates', 'marcus_millichap', 'milken_institute']).optional(),
  data_type: z.enum(['cap_rates', 'market_trends', 'economic']).optional(),
  limit: z.number().min(1).max(100).default(20),
  from_date: z.string().optional(),
  to_date: z.string().optional()
});

/**
 * GET /api/market-data/:zip_code
 * Get comprehensive market data for a specific zip code
 */
router.get('/:zip_code', async (req, res) => {
  try {
    const zipCode = req.params.zip_code;
    
    // Get latest market data for the zip code
    const marketData = await prisma.marketData.findMany({
      where: { zip_code: zipCode },
      orderBy: { measurement_date: 'desc' },
      take: 10
    });

    // Get economic indicators for the metro area
    const zipMapping = await prisma.zipCodeMapping.findUnique({
      where: { zip_code: zipCode }
    });

    let economicIndicators: any[] = [];
    if (zipMapping) {
      economicIndicators = await prisma.economicIndicator.findMany({
        where: {
          OR: [
            { metro_area: { contains: zipMapping.city } },
            { state: zipMapping.state }
          ]
        },
        orderBy: { measurement_date: 'desc' },
        take: 10
      });
    }

    // Get recent research reports for the area
    const researchReports = await prisma.researchReport.findMany({
      where: {
        OR: [
          { metro_area: { contains: zipMapping?.city || '' } },
          { region: { contains: zipMapping?.state || '' } }
        ]
      },
      orderBy: { publication_date: 'desc' },
      take: 5
    });

    // Calculate market summary statistics
    const marketSummary = calculateMarketSummary(marketData);

    res.json({
      zipCode,
      marketData,
      economicIndicators,
      researchReports,
      summary: marketSummary,
      lastUpdated: marketData[0]?.measurement_date || null
    });

  } catch (error) {
    logger.error('Market data retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve market data' });
  }
});

/**
 * GET /api/market-data/search
 * Advanced market data search with filters
 */
router.get('/search', async (req, res) => {
  try {
    const queryParams = marketDataQuerySchema.parse(req.query);
    
    // Build dynamic where clause
    const whereClause: any = {};
    
    if (queryParams.zip_code) {
      whereClause.zip_code = queryParams.zip_code;
    }
    
    if (queryParams.metro_area) {
      whereClause.metro_area = { contains: queryParams.metro_area, mode: 'insensitive' };
    }
    
    if (queryParams.region) {
      whereClause.region = { contains: queryParams.region, mode: 'insensitive' };
    }
    
    if (queryParams.state) {
      whereClause.state = queryParams.state;
    }
    
    if (queryParams.data_source) {
      whereClause.data_source = queryParams.data_source;
    }
    
    if (queryParams.data_type) {
      whereClause.data_type = queryParams.data_type;
    }

    // Date range filter
    if (queryParams.from_date || queryParams.to_date) {
      whereClause.measurement_date = {};
      if (queryParams.from_date) {
        whereClause.measurement_date.gte = new Date(queryParams.from_date);
      }
      if (queryParams.to_date) {
        whereClause.measurement_date.lte = new Date(queryParams.to_date);
      }
    }

    const marketData = await prisma.marketData.findMany({
      where: whereClause,
      orderBy: { measurement_date: 'desc' },
      take: queryParams.limit
    });

    const total = await prisma.marketData.count({ where: whereClause });

    res.json({
      data: marketData,
      total,
      filters: queryParams
    });

  } catch (error) {
    logger.error('Market data search failed:', error);
    res.status(400).json({ error: 'Invalid search parameters' });
  }
});

/**
 * GET /api/market-data/cap-rates/:property_type
 * Get cap rates by property type and region
 */
router.get('/cap-rates/:property_type', async (req, res) => {
  try {
    const { property_type } = req.params;
    const { region, metro_area, limit = 50 } = req.query;

    // Build where clause for cap rate data
    const whereClause: any = {
      data_type: 'cap_rates'
    };

    if (region) {
      whereClause.region = { contains: region as string, mode: 'insensitive' };
    }

    if (metro_area) {
      whereClause.metro_area = { contains: metro_area as string, mode: 'insensitive' };
    }

    const capRateData = await prisma.marketData.findMany({
      where: whereClause,
      orderBy: { measurement_date: 'desc' },
      take: Number(limit)
    });

    // Extract cap rates for the specific property type
    const propertyCapRates = capRateData.map(data => {
      let capRate = null;
      
      switch (property_type.toLowerCase()) {
        case 'multifamily':
          capRate = data.multifamily_cap_rate;
          break;
        case 'office':
          capRate = data.office_cap_rate;
          break;
        case 'retail':
          capRate = data.retail_cap_rate;
          break;
        case 'industrial':
          capRate = data.industrial_cap_rate;
          break;
      }

      return {
        ...data,
        cap_rate: capRate
      };
    }).filter(data => data.cap_rate !== null);

    // Calculate statistics
    const capRates = propertyCapRates.map(d => d.cap_rate!);
    const stats = {
      average: capRates.reduce((sum, rate) => sum + rate, 0) / capRates.length,
      min: Math.min(...capRates),
      max: Math.max(...capRates),
      count: capRates.length
    };

    res.json({
      propertyType: property_type,
      data: propertyCapRates,
      statistics: stats
    });

  } catch (error) {
    logger.error('Cap rate data retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve cap rate data' });
  }
});

/**
 * GET /api/market-data/trends/:metric
 * Get trend data for a specific metric over time
 */
router.get('/trends/:metric', async (req, res) => {
  try {
    const { metric } = req.params;
    const { zip_code, metro_area, months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const whereClause: any = {
      measurement_date: { gte: startDate }
    };

    if (zip_code) {
      whereClause.zip_code = zip_code;
    } else if (metro_area) {
      whereClause.metro_area = { contains: metro_area as string, mode: 'insensitive' };
    }

    const trendData = await prisma.marketData.findMany({
      where: whereClause,
      orderBy: { measurement_date: 'asc' }
    });

    // Extract the specific metric
    const metricData = trendData.map(data => {
      let value = null;
      
      switch (metric.toLowerCase()) {
        case 'cap_rate':
          value = data.multifamily_cap_rate; // Default to multifamily
          break;
        case 'rent':
          value = data.avg_rent_per_unit;
          break;
        case 'vacancy':
          value = data.vacancy_rate;
          break;
        case 'price_appreciation':
          value = data.price_appreciation;
          break;
        case 'rent_growth':
          value = data.rent_growth;
          break;
      }

      return {
        date: data.measurement_date,
        value,
        source: data.data_source
      };
    }).filter(item => item.value !== null);

    // Calculate trend direction
    if (metricData.length >= 2) {
      const latest = metricData[metricData.length - 1].value!;
      const previous = metricData[metricData.length - 2].value!;
      const trendDirection = latest > previous ? 'up' : latest < previous ? 'down' : 'stable';
      const changePercent = ((latest - previous) / previous) * 100;

      res.json({
        metric,
        data: metricData,
        trend: {
          direction: trendDirection,
          changePercent: Math.round(changePercent * 100) / 100,
          latest: latest,
          previous: previous
        }
      });
    } else {
      res.json({
        metric,
        data: metricData,
        trend: null
      });
    }

  } catch (error) {
    logger.error('Trend data retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve trend data' });
  }
});

/**
 * GET /api/market-data/comparison
 * Compare market metrics across multiple areas
 */
router.get('/comparison', async (req, res) => {
  try {
    const { zip_codes, metro_areas, metrics } = req.query;
    
    if (!zip_codes && !metro_areas) {
      return res.status(400).json({ error: 'Must provide zip_codes or metro_areas for comparison' });
    }

    const locations = [];
    
    if (zip_codes) {
      const zipArray = (zip_codes as string).split(',');
      for (const zip of zipArray) {
        const data = await getLatestMarketData({ zip_code: zip.trim() });
        if (data) {
          locations.push({ type: 'zip_code', identifier: zip.trim(), data });
        }
      }
    }

    if (metro_areas) {
      const metroArray = (metro_areas as string).split(',');
      for (const metro of metroArray) {
        const data = await getLatestMarketData({ metro_area: metro.trim() });
        if (data) {
          locations.push({ type: 'metro_area', identifier: metro.trim(), data });
        }
      }
    }

    // Extract requested metrics for comparison
    const requestedMetrics = (metrics as string)?.split(',') || ['cap_rate', 'rent', 'vacancy'];
    
    const comparison = locations.map(location => {
      const comparisonData: any = {
        location: location.identifier,
        type: location.type
      };

      for (const metric of requestedMetrics) {
        switch (metric.toLowerCase()) {
          case 'cap_rate':
            comparisonData.cap_rate = location.data.multifamily_cap_rate;
            break;
          case 'rent':
            comparisonData.avg_rent = location.data.avg_rent_per_unit;
            break;
          case 'vacancy':
            comparisonData.vacancy_rate = location.data.vacancy_rate;
            break;
          case 'price_appreciation':
            comparisonData.price_appreciation = location.data.price_appreciation;
            break;
          case 'rent_growth':
            comparisonData.rent_growth = location.data.rent_growth;
            break;
        }
      }

      return comparisonData;
    });

    res.json({
      comparison,
      metrics: requestedMetrics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Market comparison failed:', error);
    res.status(500).json({ error: 'Failed to generate market comparison' });
  }
});

/**
 * POST /api/market-data/bulk-import
 * Bulk import market data (for admin use)
 */
router.post('/bulk-import', async (req, res) => {
  try {
    const { data, source } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }

    const importResults = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const item of data) {
      try {
        await prisma.marketData.create({
          data: {
            ...item,
            data_source: source,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        importResults.imported++;
      } catch (error) {
        importResults.errors.push(`Failed to import item: ${error}`);
        importResults.skipped++;
      }
    }

    logger.info(`Bulk import completed: ${importResults.imported} imported, ${importResults.skipped} skipped`);
    
    res.json(importResults);

  } catch (error) {
    logger.error('Bulk import failed:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// Helper functions
function calculateMarketSummary(marketData: any[]) {
  if (marketData.length === 0) {
    return null;
  }

  const latestData = marketData[0];
  
  return {
    avgCapRate: calculateAverage(marketData, 'multifamily_cap_rate'),
    avgRent: calculateAverage(marketData, 'avg_rent_per_unit'),
    avgVacancy: calculateAverage(marketData, 'vacancy_rate'),
    priceAppreciation: latestData.price_appreciation,
    rentGrowth: latestData.rent_growth,
    dataPoints: marketData.length,
    dateRange: {
      latest: marketData[0].measurement_date,
      oldest: marketData[marketData.length - 1].measurement_date
    }
  };
}

function calculateAverage(data: any[], field: string): number | null {
  const values = data.map(item => item[field]).filter(val => val !== null && val !== undefined);
  if (values.length === 0) return null;
  
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

async function getLatestMarketData(filter: { zip_code?: string; metro_area?: string }) {
  const whereClause: any = {};
  
  if (filter.zip_code) {
    whereClause.zip_code = filter.zip_code;
  }
  
  if (filter.metro_area) {
    whereClause.metro_area = { contains: filter.metro_area, mode: 'insensitive' };
  }

  return await prisma.marketData.findFirst({
    where: whereClause,
    orderBy: { measurement_date: 'desc' }
  });
}

export default router;