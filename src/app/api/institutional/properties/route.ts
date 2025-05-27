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
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const minCapRate = searchParams.get('minCapRate') ? Number(searchParams.get('minCapRate')) : undefined;
    const maxCapRate = searchParams.get('maxCapRate') ? Number(searchParams.get('maxCapRate')) : undefined;
    const source = searchParams.get('source'); // cbre, colliers, jll, cushman_wakefield
    const status = searchParams.get('status') || 'active';
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: status
    };

    if (zipCode) {
      where.zip_code = zipCode;
    }

    if (metroArea) {
      where.market_area = {
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
      where.listing_price = {};
      if (minPrice) where.listing_price.gte = minPrice;
      if (maxPrice) where.listing_price.lte = maxPrice;
    }

    if (minCapRate || maxCapRate) {
      where.cap_rate = {};
      if (minCapRate) where.cap_rate.gte = minCapRate / 100;
      if (maxCapRate) where.cap_rate.lte = maxCapRate / 100;
    }

    // Execute query with pagination
    const [properties, totalCount] = await Promise.all([
      prisma.institutionalProperty.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.institutionalProperty.count({ where })
    ]);

    // Get aggregated statistics
    const stats = await prisma.institutionalProperty.aggregate({
      where,
      _avg: {
        listing_price: true,
        cap_rate: true,
        price_per_unit: true,
        price_per_sqft: true
      },
      _min: {
        listing_price: true,
        cap_rate: true
      },
      _max: {
        listing_price: true,
        cap_rate: true
      },
      _count: {
        _all: true
      }
    });

    // Get source distribution
    const sourceDistribution = await prisma.institutionalProperty.groupBy({
      by: ['source'],
      where,
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });

    // Get property type distribution
    const typeDistribution = await prisma.institutionalProperty.groupBy({
      by: ['property_type'],
      where,
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });

    // Format response
    const response = {
      properties: properties.map(property => ({
        ...property,
        cap_rate: property.cap_rate ? property.cap_rate * 100 : null, // Convert to percentage
        data_confidence: property.data_confidence ? Math.round(property.data_confidence * 100) : null
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      },
      aggregations: {
        stats: {
          count: stats._count._all,
          avgPrice: stats._avg.listing_price,
          avgCapRate: stats._avg.cap_rate ? stats._avg.cap_rate * 100 : null,
          avgPricePerUnit: stats._avg.price_per_unit,
          avgPricePerSqft: stats._avg.price_per_sqft,
          priceRange: {
            min: stats._min.listing_price,
            max: stats._max.listing_price
          },
          capRateRange: {
            min: stats._min.cap_rate ? stats._min.cap_rate * 100 : null,
            max: stats._max.cap_rate ? stats._max.cap_rate * 100 : null
          }
        },
        sourceDistribution: sourceDistribution.map(item => ({
          source: item.source,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        })),
        typeDistribution: typeDistribution.map(item => ({
          propertyType: item.property_type,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional properties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'properties',
      searchParams = {},
      priority = 1
    } = body;

    if (!source || !['cbre', 'colliers', 'jll', 'cushman_wakefield'].includes(source)) {
      return NextResponse.json(
        { error: 'Valid source is required (cbre, colliers, jll, cushman_wakefield)' },
        { status: 400 }
      );
    }

    // Create scraping job
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
      message: `Institutional scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating institutional scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create scraping job' },
      { status: 500 }
    );
  }
}