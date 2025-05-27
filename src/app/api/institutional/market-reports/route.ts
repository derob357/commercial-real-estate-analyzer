import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const source = searchParams.get('source');
    const reportType = searchParams.get('reportType');
    const marketArea = searchParams.get('marketArea');
    const propertyType = searchParams.get('propertyType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const keyword = searchParams.get('keyword');
    const sortBy = searchParams.get('sortBy') || 'publication_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (source) {
      where.source = source;
    }

    if (reportType) {
      where.report_type = {
        contains: reportType,
        mode: 'insensitive'
      };
    }

    if (marketArea) {
      where.market_area = {
        contains: marketArea,
        mode: 'insensitive'
      };
    }

    if (propertyType) {
      where.property_type = {
        contains: propertyType,
        mode: 'insensitive'
      };
    }

    if (dateFrom || dateTo) {
      where.publication_date = {};
      if (dateFrom) where.publication_date.gte = new Date(dateFrom);
      if (dateTo) where.publication_date.lte = new Date(dateTo);
    }

    if (keyword) {
      where.OR = [
        {
          title: {
            contains: keyword,
            mode: 'insensitive'
          }
        },
        {
          summary: {
            contains: keyword,
            mode: 'insensitive'
          }
        },
        {
          key_findings: {
            contains: keyword,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Execute query with pagination
    const [reports, totalCount] = await Promise.all([
      prisma.marketResearchReport.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.marketResearchReport.count({ where })
    ]);

    // Get aggregated statistics
    const sourceDistribution = await prisma.marketResearchReport.groupBy({
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

    const reportTypeDistribution = await prisma.marketResearchReport.groupBy({
      by: ['report_type'],
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

    const monthlyDistribution = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', publication_date) as month,
        COUNT(*) as count
      FROM MarketResearchReport
      WHERE publication_date >= datetime('now', '-12 months')
      GROUP BY strftime('%Y-%m', publication_date)
      ORDER BY month DESC
    ` as Array<{ month: string; count: number }>;

    // Format response
    const response = {
      reports: reports.map(report => ({
        ...report,
        key_findings: report.key_findings ? JSON.parse(report.key_findings) : null,
        investment_themes: report.investment_themes ? JSON.parse(report.investment_themes) : null,
        cap_rate_data: report.cap_rate_data ? JSON.parse(report.cap_rate_data) : null,
        economic_indicators: report.economic_indicators ? JSON.parse(report.economic_indicators) : null,
        extracted_metrics: report.extracted_metrics ? JSON.parse(report.extracted_metrics) : null,
        extraction_confidence: report.extraction_confidence ? Math.round(report.extraction_confidence * 100) : null
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
        sourceDistribution: sourceDistribution.map(item => ({
          source: item.source,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        })),
        reportTypeDistribution: reportTypeDistribution.map(item => ({
          reportType: item.report_type,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        })),
        monthlyDistribution: monthlyDistribution.map(item => ({
          month: item.month,
          count: Number(item.count)
        })),
        totalReports: totalCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching market research reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market research reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'research',
      searchParams = {},
      priority = 2
    } = body;

    if (!source || !['cbre', 'colliers', 'jll', 'cushman_wakefield'].includes(source)) {
      return NextResponse.json(
        { error: 'Valid source is required (cbre, colliers, jll, cushman_wakefield)' },
        { status: 400 }
      );
    }

    // Create research scraping job
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
      message: `Research scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating research scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create research scraping job' },
      { status: 500 }
    );
  }
}