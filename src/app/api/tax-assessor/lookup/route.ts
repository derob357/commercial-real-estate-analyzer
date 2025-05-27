import { type NextRequest, NextResponse } from 'next/server'
import { TaxAssessorScraper } from '@/lib/tax-assessor/scraper'
import { TaxAssessorMapper } from '@/lib/tax-assessor/mapping'
import { AddressNormalizer } from '@/lib/address/normalizer'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, zip_code, force_refresh = false } = body

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Normalize the address
    const normalizedAddress = AddressNormalizer.normalizeAddress(address)
    const normalizedString = [
      normalizedAddress.streetNumber,
      normalizedAddress.streetName,
      normalizedAddress.city,
      normalizedAddress.state,
      normalizedAddress.zipCode || zip_code
    ].filter(Boolean).join(' ')

    // Check if we already have tax data for this property (unless force refresh)
    if (!force_refresh) {
      const existingProperty = await prisma.property.findFirst({
        where: {
          address: {
            contains: address,
            mode: 'insensitive'
          },
          zip_code: zip_code || normalizedAddress.zipCode
        },
        include: {
          tax_assessments: {
            orderBy: { assessment_year: 'desc' },
            take: 1
          },
          tax_payments: {
            orderBy: { tax_year: 'desc' },
            take: 3
          }
        }
      })

      if (existingProperty && existingProperty.last_tax_update) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - existingProperty.last_tax_update.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Return cached data if updated within last 30 days
        if (daysSinceUpdate < 30) {
          return NextResponse.json({
            success: true,
            cached: true,
            property: existingProperty,
            tax_data: {
              assessments: existingProperty.tax_assessments,
              payments: existingProperty.tax_payments
            },
            last_updated: existingProperty.last_tax_update
          })
        }
      }
    }

    // Initialize scraper
    const scraper = new TaxAssessorScraper()
    let scrapeResult

    try {
      // Scrape tax assessor data
      if (zip_code || normalizedAddress.zipCode) {
        scrapeResult = await scraper.scrapeByZipCode(
          zip_code || normalizedAddress.zipCode!, 
          address
        )
      } else {
        return NextResponse.json(
          { error: 'ZIP code is required for tax assessor lookup' },
          { status: 400 }
        )
      }

      if (!scrapeResult.success) {
        return NextResponse.json({
          success: false,
          error: scrapeResult.error,
          source: scrapeResult.source
        }, { status: 422 })
      }

      // Find or create property record
      let property = await prisma.property.findFirst({
        where: {
          address: {
            contains: address,
            mode: 'insensitive'
          },
          zip_code: zip_code || normalizedAddress.zipCode
        }
      })

      if (!property) {
        // Create new property record
        property = await prisma.property.create({
          data: {
            address: normalizedString,
            street_number: normalizedAddress.streetNumber,
            street_name: normalizedAddress.streetName,
            city: normalizedAddress.city || '',
            state: normalizedAddress.state || '',
            zip_code: zip_code || normalizedAddress.zipCode || '',
            latitude: normalizedAddress.latitude,
            longitude: normalizedAddress.longitude
          }
        })
      }

      // Save scraped tax data
      if (scrapeResult.data) {
        await scraper.saveTaxData(property.id, scrapeResult.data)
      }

      // Fetch updated property with tax data
      const updatedProperty = await prisma.property.findUnique({
        where: { id: property.id },
        include: {
          tax_assessments: {
            orderBy: { assessment_year: 'desc' },
            take: 5
          },
          tax_payments: {
            orderBy: { tax_year: 'desc' },
            take: 5
          }
        }
      })

      return NextResponse.json({
        success: true,
        property: updatedProperty,
        tax_data: {
          assessments: updatedProperty?.tax_assessments || [],
          payments: updatedProperty?.tax_payments || []
        },
        scrape_result: {
          source: scrapeResult.source,
          scraped_at: scrapeResult.scrapedAt
        }
      })

    } finally {
      await scraper.closeBrowser()
    }

  } catch (error) {
    console.error('Tax assessor lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error during tax assessor lookup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zip_code = searchParams.get('zip_code')

    if (!zip_code) {
      return NextResponse.json(
        { error: 'ZIP code is required' },
        { status: 400 }
      )
    }

    // Get available tax assessor info for ZIP code
    const assessor = await TaxAssessorMapper.getAssessorForZipCode(zip_code)

    if (!assessor) {
      return NextResponse.json({
        available: false,
        zip_code,
        message: 'No tax assessor configuration found for this ZIP code'
      })
    }

    return NextResponse.json({
      available: true,
      zip_code,
      assessor: {
        county: assessor.county,
        state: assessor.state,
        name: assessor.assessor_name,
        url: assessor.assessor_url,
        search_method: assessor.search_method,
        requires_javascript: assessor.requires_javascript,
        last_successful_scrape: assessor.last_successful_scrape,
        success_rate: assessor.success_count / (assessor.success_count + assessor.failure_count) || 0
      }
    })

  } catch (error) {
    console.error('Tax assessor info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}