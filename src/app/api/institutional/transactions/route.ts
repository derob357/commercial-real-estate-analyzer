import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const zipCode = searchParams.get('zipCode');
    const metroArea = searchParams.get('metroArea');
    const propertyType = searchParams.get('propertyType');
    const source = searchParams.get('source');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'sale_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (zipCode) {
      where.zip_code = zipCode;
    }

    if (metroArea) {
      // This would need to be mapped from metro area to cities/zip codes
      // For now, we'll search in the property address
      where.property_address = {
        contains: metroArea,
        mode: 'insensitive'
      };
    }

    if (propertyType) {
      where.property_type = {
        contains: propertyType,
        mode: 'insensitive'
      };
    }

    if (source) {
      where.source = source;
    }

    if (minPrice || maxPrice) {
      where.sale_price = {};
      if (minPrice) where.sale_price.gte = minPrice;
      if (maxPrice) where.sale_price.lte = maxPrice;
    }

    if (dateFrom || dateTo) {
      where.sale_date = {};
      if (dateFrom) where.sale_date.gte = new Date(dateFrom);
      if (dateTo) where.sale_date.lte = new Date(dateTo);
    }

    // Execute query with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.institutionalTransaction.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.institutionalTransaction.count({ where })
    ]);

    // Get aggregated statistics
    const stats = await prisma.institutionalTransaction.aggregate({
      where,
      _avg: {
        sale_price: true,
        cap_rate: true,
        price_per_unit: true,
        price_per_sqft: true
      },
      _sum: {
        sale_price: true
      },
      _min: {
        sale_price: true,
        cap_rate: true,
        sale_date: true
      },
      _max: {
        sale_price: true,
        cap_rate: true,
        sale_date: true
      },
      _count: {
        _all: true
      }
    });

    // Get transaction volume by month (last 12 months)
    const monthlyVolume = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', sale_date) as month,
        COUNT(*) as transaction_count,
        SUM(sale_price) as total_volume,
        AVG(sale_price) as avg_price,
        AVG(cap_rate) as avg_cap_rate
      FROM InstitutionalTransaction
      WHERE sale_date >= datetime('now', '-12 months')
        ${zipCode ? `AND zip_code = '${zipCode}'` : ''}
        ${propertyType ? `AND property_type LIKE '%${propertyType}%'` : ''}
      GROUP BY strftime('%Y-%m', sale_date)
      ORDER BY month DESC
    ` as Array<{
      month: string;
      transaction_count: number;
      total_volume: number;
      avg_price: number;
      avg_cap_rate: number;
    }>;

    // Get source and property type distributions
    const sourceDistribution = await prisma.institutionalTransaction.groupBy({
      by: ['source'],
      where,
      _count: {
        _all: true
      },
      _sum: {
        sale_price: true
      },
      orderBy: {
        _sum: {
          sale_price: 'desc'
        }
      }
    });

    const typeDistribution = await prisma.institutionalTransaction.groupBy({
      by: ['property_type'],
      where,
      _count: {
        _all: true
      },
      _avg: {
        sale_price: true,
        cap_rate: true
      },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });

    // Calculate market insights
    const marketInsights = await calculateMarketInsights(where);

    // Format response
    const response = {
      transactions: transactions.map(transaction => ({
        ...transaction,
        cap_rate: transaction.cap_rate ? transaction.cap_rate * 100 : null, // Convert to percentage
        data_confidence: transaction.data_confidence ? Math.round(transaction.data_confidence * 100) : null
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      },
      analytics: {
        summary: {
          totalTransactions: stats._count._all,
          totalVolume: stats._sum.sale_price,
          avgSalePrice: stats._avg.sale_price,
          avgCapRate: stats._avg.cap_rate ? stats._avg.cap_rate * 100 : null,
          avgPricePerUnit: stats._avg.price_per_unit,
          avgPricePerSqft: stats._avg.price_per_sqft,
          priceRange: {
            min: stats._min.sale_price,
            max: stats._max.sale_price
          },
          dateRange: {
            earliest: stats._min.sale_date,
            latest: stats._max.sale_date
          }
        },
        trends: {
          monthlyVolume: monthlyVolume.map(item => ({
            month: item.month,
            transactionCount: Number(item.transaction_count),
            totalVolume: Number(item.total_volume || 0),
            avgPrice: Number(item.avg_price || 0),
            avgCapRate: item.avg_cap_rate ? Number(item.avg_cap_rate) * 100 : null
          }))
        },
        distributions: {
          bySource: sourceDistribution.map(item => ({
            source: item.source,
            count: item._count._all,
            volume: item._sum.sale_price || 0,
            percentage: Math.round((item._count._all / totalCount) * 100)
          })),
          byPropertyType: typeDistribution.map(item => ({
            propertyType: item.property_type,
            count: item._count._all,
            avgPrice: item._avg.sale_price,
            avgCapRate: item._avg.cap_rate ? item._avg.cap_rate * 100 : null,
            percentage: Math.round((item._count._all / totalCount) * 100)
          }))
        },
        insights: marketInsights
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional transactions' },
      { status: 500 }
    );
  }
}

async function calculateMarketInsights(where: any) {
  try {
    // Calculate year-over-year changes
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const currentYearStats = await prisma.institutionalTransaction.aggregate({
      where: {
        ...where,
        sale_date: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`)
        }
      },
      _avg: {
        sale_price: true,
        cap_rate: true
      },
      _count: {
        _all: true
      }
    });

    const lastYearStats = await prisma.institutionalTransaction.aggregate({
      where: {
        ...where,
        sale_date: {
          gte: new Date(`${lastYear}-01-01`),
          lte: new Date(`${lastYear}-12-31`)
        }
      },
      _avg: {
        sale_price: true,
        cap_rate: true
      },
      _count: {
        _all: true
      }
    });

    const insights = {
      marketVelocity: 'moderate', // Default value
      priceAppreciation: 0,
      capRateTrend: 0,
      transactionVolumeChange: 0,
      marketSentiment: 'neutral'
    };

    if (lastYearStats._avg.sale_price && currentYearStats._avg.sale_price) {
      insights.priceAppreciation = ((currentYearStats._avg.sale_price - lastYearStats._avg.sale_price) / lastYearStats._avg.sale_price) * 100;
    }

    if (lastYearStats._avg.cap_rate && currentYearStats._avg.cap_rate) {
      insights.capRateTrend = ((currentYearStats._avg.cap_rate - lastYearStats._avg.cap_rate) / lastYearStats._avg.cap_rate) * 100;
    }

    if (lastYearStats._count._all > 0) {
      insights.transactionVolumeChange = ((currentYearStats._count._all - lastYearStats._count._all) / lastYearStats._count._all) * 100;
    }

    // Determine market velocity based on transaction volume
    if (insights.transactionVolumeChange > 20) {
      insights.marketVelocity = 'hot';
    } else if (insights.transactionVolumeChange < -20) {
      insights.marketVelocity = 'slow';
    }

    // Determine market sentiment
    if (insights.priceAppreciation > 5 && insights.transactionVolumeChange > 10) {
      insights.marketSentiment = 'bullish';
    } else if (insights.priceAppreciation < -5 && insights.transactionVolumeChange < -10) {
      insights.marketSentiment = 'bearish';
    }

    return insights;

  } catch (error) {
    console.error('Error calculating market insights:', error);
    return {
      marketVelocity: 'moderate',
      priceAppreciation: 0,
      capRateTrend: 0,
      transactionVolumeChange: 0,
      marketSentiment: 'neutral'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'transactions',
      searchParams = {},
      priority = 1
    } = body;

    if (!source || !['cbre', 'colliers', 'jll', 'cushman_wakefield'].includes(source)) {
      return NextResponse.json(
        { error: 'Valid source is required (cbre, colliers, jll, cushman_wakefield)' },
        { status: 400 }
      );
    }

    // Create transaction scraping job
    const job = await prisma.institutionalScrapeJob.create({
      data: {
        source,
        job_type: jobType,
        search_params: JSON.stringify(searchParams),
        priority,
        status: 'pending'
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Transaction scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating transaction scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction scraping job' },
      { status: 500 }
    );
  }
}