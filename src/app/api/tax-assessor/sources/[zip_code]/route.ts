import { type NextRequest, NextResponse } from 'next/server'
import { TaxAssessorMapper } from '@/lib/tax-assessor/mapping'

export async function GET(
  request: NextRequest,
  { params }: { params: { zip_code: string } }
) {
  try {
    const zipCode = params.zip_code

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json(
        { error: 'Valid 5-digit ZIP code is required' },
        { status: 400 }
      )
    }

    const assessor = await TaxAssessorMapper.getAssessorForZipCode(zipCode)

    if (!assessor) {
      return NextResponse.json({
        zip_code: zipCode,
        available: false,
        message: 'No tax assessor configuration found for this ZIP code',
        suggestions: [
          'This ZIP code may not be supported yet',
          'Try a nearby ZIP code',
          'Contact support to request this area'
        ]
      })
    }

    // Calculate success rate
    const totalAttempts = assessor.success_count + assessor.failure_count
    const successRate = totalAttempts > 0 ? (assessor.success_count / totalAttempts) : 0

    return NextResponse.json({
      zip_code: zipCode,
      available: true,
      assessor: {
        id: assessor.id,
        county: assessor.county,
        state: assessor.state,
        name: assessor.assessor_name,
        url: assessor.assessor_url,
        search_method: assessor.search_method,
        requires_javascript: assessor.requires_javascript,
        requires_authentication: assessor.requires_authentication,
        rate_limit_ms: assessor.rate_limit_ms,
        is_active: assessor.is_active,
        statistics: {
          success_count: assessor.success_count,
          failure_count: assessor.failure_count,
          success_rate: successRate,
          last_successful_scrape: assessor.last_successful_scrape,
          last_failed_scrape: assessor.last_failed_scrape
        },
        notes: assessor.notes
      }
    })

  } catch (error) {
    console.error('Error fetching tax assessor source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}