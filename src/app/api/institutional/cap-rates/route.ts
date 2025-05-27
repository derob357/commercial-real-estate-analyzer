import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const metroArea = searchParams.get('metroArea');
    const zipCode = searchParams.get('zipCode');
    const propertyType = searchParams.get('propertyType');
    const source = searchParams.get('source');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeTrends = searchParams.get('includeTrends') === 'true';

    // Build where clause for market data
    const marketDataWhere: any = {};
    
    if (metroArea) {
      marketDataWhere.metro_area = {
        contains: metroArea,
        mode: 'insensitive'
      };
    }

    if (zipCode) {
      marketDataWhere.zip_code = zipCode;
    }

    if (source) {
      marketDataWhere.source = source;
    }

    if (dateFrom || dateTo) {
      marketDataWhere.measurement_date = {};
      if (dateFrom) marketDataWhere.measurement_date.gte = new Date(dateFrom);
      if (dateTo) marketDataWhere.measurement_date.lte = new Date(dateTo);
    }

    // Get latest institutional market data
    const institutionalCapRates = await prisma.institutionalMarketData.findMany({
      where: marketDataWhere,
      orderBy: {
        measurement_date: 'desc'
      },
      take: 100 // Limit to recent data points
    });

    // Get cap rates from property listings
    const propertyCapRates = await prisma.institutionalProperty.groupBy({
      by: ['property_type', 'source'],
      where: {
        cap_rate: {
          not: null
        },
        ...(zipCode && { zip_code: zipCode }),
        ...(propertyType && { 
          property_type: {
            contains: propertyType,
            mode: 'insensitive'
          }
        })
      },
      _avg: {
        cap_rate: true
      },
      _count: {
        cap_rate: true
      }
    });

    // Get cap rates from transactions
    const transactionCapRates = await prisma.institutionalTransaction.groupBy({
      by: ['property_type', 'source'],
      where: {
        cap_rate: {
          not: null
        },
        ...(zipCode && { zip_code: zipCode }),
        ...(propertyType && { 
          property_type: {
            contains: propertyType,
            mode: 'insensitive'
          }
        }),
        sale_date: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      },
      _avg: {
        cap_rate: true
      },
      _count: {
        cap_rate: true
      }
    });

    // Aggregate cap rates by property type
    const capRatesByType = aggregateCapRatesByType(
      institutionalCapRates,
      propertyCapRates,
      transactionCapRates
    );

    // Aggregate cap rates by source
    const capRatesBySource = aggregateCapRatesBySource(
      institutionalCapRates,
      propertyCapRates,
      transactionCapRates
    );

    // Calculate market statistics
    const marketStats = calculateMarketStats(capRatesByType);

    let trends = null;
    if (includeTrends) {
      trends = await calculateCapRateTrends(marketDataWhere, propertyType);
    }

    // Format response
    const response = {
      capRates: {
        byPropertyType: capRatesByType.map(item => ({
          ...item,
          avgCapRate: item.avgCapRate * 100, // Convert to percentage
          ranges: {
            min: item.minCapRate ? item.minCapRate * 100 : null,
            max: item.maxCapRate ? item.maxCapRate * 100 : null
          }
        })),
        bySource: capRatesBySource.map(item => ({
          ...item,
          avgCapRate: item.avgCapRate * 100, // Convert to percentage
        }))
      },
      marketStats: {
        ...marketStats,
        overallAvgCapRate: marketStats.overallAvgCapRate * 100,
        spread: {
          min: marketStats.spread.min * 100,
          max: marketStats.spread.max * 100,
          range: (marketStats.spread.max - marketStats.spread.min) * 100
        }
      },
      trends: trends ? {
        ...trends,
        monthlyData: trends.monthlyData.map((item: any) => ({
          ...item,
          avgCapRate: item.avgCapRate ? item.avgCapRate * 100 : null
        }))
      } : null,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: institutionalCapRates.length + propertyCapRates.length + transactionCapRates.length,
        sources: [...new Set([
          ...institutionalCapRates.map(item => item.source),
          ...propertyCapRates.map(item => item.source),
          ...transactionCapRates.map(item => item.source)
        ])],
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional cap rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional cap rates' },
      { status: 500 }
    );
  }
}

function aggregateCapRatesByType(
  institutionalData: any[],
  propertyData: any[],
  transactionData: any[]
) {
  const typeMap = new Map();

  // Process institutional market data
  institutionalData.forEach(item => {
    const types = ['multifamily', 'office', 'retail', 'industrial', 'hotel'];
    types.forEach(type => {
      const capRateField = `${type}_cap_rate`;
      if (item[capRateField]) {
        if (!typeMap.has(type)) {
          typeMap.set(type, { rates: [], sources: new Set(), count: 0 });
        }
        typeMap.get(type).rates.push(item[capRateField]);
        typeMap.get(type).sources.add(item.source);
        typeMap.get(type).count++;
      }
    });
  });

  // Process property listing data
  propertyData.forEach(item => {
    const type = item.property_type.toLowerCase();
    if (!typeMap.has(type)) {
      typeMap.set(type, { rates: [], sources: new Set(), count: 0 });
    }
    if (item._avg.cap_rate) {
      typeMap.get(type).rates.push(item._avg.cap_rate);
      typeMap.get(type).sources.add(item.source);
      typeMap.get(type).count += item._count.cap_rate;
    }
  });

  // Process transaction data
  transactionData.forEach(item => {
    const type = item.property_type.toLowerCase();
    if (!typeMap.has(type)) {
      typeMap.set(type, { rates: [], sources: new Set(), count: 0 });
    }
    if (item._avg.cap_rate) {
      typeMap.get(type).rates.push(item._avg.cap_rate);
      typeMap.get(type).sources.add(item.source);
      typeMap.get(type).count += item._count.cap_rate;
    }
  });

  // Calculate aggregated statistics
  return Array.from(typeMap.entries()).map(([type, data]) => {
    const rates = data.rates;
    const avgCapRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const minCapRate = Math.min(...rates);
    const maxCapRate = Math.max(...rates);
    
    return {
      propertyType: type,
      avgCapRate,
      minCapRate,
      maxCapRate,
      dataPoints: rates.length,
      sources: Array.from(data.sources),
      totalCount: data.count
    };
  }).sort((a, b) => b.totalCount - a.totalCount);
}

function aggregateCapRatesBySource(
  institutionalData: any[],
  propertyData: any[],
  transactionData: any[]
) {
  const sourceMap = new Map();

  // Process institutional market data
  institutionalData.forEach(item => {
    if (!sourceMap.has(item.source)) {
      sourceMap.set(item.source, { rates: [], propertyTypes: new Set(), count: 0 });
    }
    
    const types = ['multifamily', 'office', 'retail', 'industrial', 'hotel'];
    types.forEach(type => {
      const capRateField = `${type}_cap_rate`;
      if (item[capRateField]) {
        sourceMap.get(item.source).rates.push(item[capRateField]);
        sourceMap.get(item.source).propertyTypes.add(type);
        sourceMap.get(item.source).count++;
      }
    });
  });

  // Process property and transaction data
  [...propertyData, ...transactionData].forEach(item => {
    if (!sourceMap.has(item.source)) {
      sourceMap.set(item.source, { rates: [], propertyTypes: new Set(), count: 0 });
    }
    if (item._avg.cap_rate) {
      sourceMap.get(item.source).rates.push(item._avg.cap_rate);
      sourceMap.get(item.source).propertyTypes.add(item.property_type.toLowerCase());
      sourceMap.get(item.source).count += item._count.cap_rate;
    }
  });

  // Calculate aggregated statistics
  return Array.from(sourceMap.entries()).map(([source, data]) => {
    const rates = data.rates;
    const avgCapRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    return {
      source,
      avgCapRate,
      dataPoints: rates.length,
      propertyTypes: Array.from(data.propertyTypes),
      totalCount: data.count
    };
  }).sort((a, b) => b.totalCount - a.totalCount);
}

function calculateMarketStats(capRatesByType: any[]) {
  if (capRatesByType.length === 0) {
    return {
      overallAvgCapRate: 0,
      spread: { min: 0, max: 0 },
      mostActiveType: null,
      totalDataPoints: 0
    };
  }

  const allRates = capRatesByType.map(item => item.avgCapRate);
  const overallAvgCapRate = allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length;
  const minRate = Math.min(...allRates);
  const maxRate = Math.max(...allRates);
  const mostActiveType = capRatesByType[0].propertyType; // Already sorted by count
  const totalDataPoints = capRatesByType.reduce((sum, item) => sum + item.dataPoints, 0);

  return {
    overallAvgCapRate,
    spread: { min: minRate, max: maxRate },
    mostActiveType,
    totalDataPoints
  };
}

async function calculateCapRateTrends(whereClause: any, propertyType?: string) {
  try {
    // Get monthly cap rate data for the last 12 months
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', measurement_date) as month,
        AVG(multifamily_cap_rate) as multifamily_avg,
        AVG(office_cap_rate) as office_avg,
        AVG(retail_cap_rate) as retail_avg,
        AVG(industrial_cap_rate) as industrial_avg,
        COUNT(*) as data_points
      FROM InstitutionalMarketData
      WHERE measurement_date >= datetime('now', '-12 months')
        ${whereClause.metro_area ? `AND metro_area LIKE '%${whereClause.metro_area}%'` : ''}
        ${whereClause.zip_code ? `AND zip_code = '${whereClause.zip_code}'` : ''}
      GROUP BY strftime('%Y-%m', measurement_date)
      ORDER BY month DESC
    ` as Array<{
      month: string;
      multifamily_avg: number;
      office_avg: number;
      retail_avg: number;
      industrial_avg: number;
      data_points: number;
    }>;

    // Calculate overall trend direction
    const currentMonth = monthlyData[0];
    const previousMonth = monthlyData[1];
    
    let trendDirection = 'stable';
    if (currentMonth && previousMonth) {
      const currentAvg = (currentMonth.multifamily_avg + currentMonth.office_avg + currentMonth.retail_avg + currentMonth.industrial_avg) / 4;
      const previousAvg = (previousMonth.multifamily_avg + previousMonth.office_avg + previousMonth.retail_avg + previousMonth.industrial_avg) / 4;
      
      if (currentAvg > previousAvg * 1.02) {
        trendDirection = 'increasing';
      } else if (currentAvg < previousAvg * 0.98) {
        trendDirection = 'decreasing';
      }
    }

    return {
      monthlyData: monthlyData.map(item => ({
        month: item.month,
        multifamilyAvg: item.multifamily_avg,
        officeAvg: item.office_avg,
        retailAvg: item.retail_avg,
        industrialAvg: item.industrial_avg,
        dataPoints: Number(item.data_points)
      })),
      trendDirection,
      dataAvailability: monthlyData.length > 0 ? 'good' : 'limited'
    };

  } catch (error) {
    console.error('Error calculating cap rate trends:', error);
    return {
      monthlyData: [],
      trendDirection: 'unknown',
      dataAvailability: 'unavailable'
    };
  }
}