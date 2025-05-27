import { type NextRequest, NextResponse } from 'next/server'
import { EnhancedUnderwritingCalculator, type PropertyFinancials } from '@/lib/underwriting/enhanced-calculator'
import { TaxAssessorScraper } from '@/lib/tax-assessor/scraper'
import { AddressNormalizer } from '@/lib/address/normalizer'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      property_data, 
      financials, 
      include_tax_data = true, 
      force_refresh_tax = false 
    } = body

    // Validate required inputs
    if (!property_data?.address) {
      return NextResponse.json(
        { error: 'Property address is required' },
        { status: 400 }
      )
    }

    if (!financials?.purchasePrice || !financials?.grossRentalIncome) {
      return NextResponse.json(
        { error: 'Purchase price and gross rental income are required' },
        { status: 400 }
      )
    }

    // Normalize address
    const normalizedAddress = AddressNormalizer.normalizeAddress(property_data.address)
    const normalizedString = [
      normalizedAddress.streetNumber,
      normalizedAddress.streetName,
      normalizedAddress.city,
      normalizedAddress.state,
      normalizedAddress.zipCode || property_data.zip_code
    ].filter(Boolean).join(' ')

    // Find or create property
    let property = await prisma.property.findFirst({
      where: {
        address: {
          contains: property_data.address,
          mode: 'insensitive'
        },
        zip_code: property_data.zip_code || normalizedAddress.zipCode
      },
      include: {
        tax_assessments: { orderBy: { assessment_year: 'desc' }, take: 5 },
        tax_payments: { orderBy: { tax_year: 'desc' }, take: 5 }
      }
    })

    if (!property) {
      property = await prisma.property.create({
        data: {
          address: normalizedString,
          street_number: normalizedAddress.streetNumber,
          street_name: normalizedAddress.streetName,
          city: normalizedAddress.city || property_data.city || '',
          state: normalizedAddress.state || property_data.state || '',
          zip_code: property_data.zip_code || normalizedAddress.zipCode || '',
          county: property_data.county,
          units: property_data.units,
          sq_ft: property_data.sq_ft,
          year_built: property_data.year_built,
          property_type: property_data.property_type || 'multifamily',
          property_subtype: property_data.property_subtype,
          listing_price: property_data.listing_price,
          description: property_data.description,
          latitude: normalizedAddress.latitude,
          longitude: normalizedAddress.longitude
        },
        include: {
          tax_assessments: { orderBy: { assessment_year: 'desc' }, take: 5 },
          tax_payments: { orderBy: { tax_year: 'desc' }, take: 5 }
        }
      })
    }

    // Get tax data if requested and needed
    let taxDataRefreshed = false
    if (include_tax_data) {
      const needsTaxRefresh = force_refresh_tax || 
        !property.last_tax_update || 
        (Date.now() - property.last_tax_update.getTime()) > (30 * 24 * 60 * 60 * 1000) // 30 days

      if (needsTaxRefresh && (property_data.zip_code || normalizedAddress.zipCode)) {
        try {
          const scraper = new TaxAssessorScraper()
          const scrapeResult = await scraper.scrapeByZipCode(
            property_data.zip_code || normalizedAddress.zipCode!,
            property_data.address
          )

          if (scrapeResult.success && scrapeResult.data) {
            await scraper.saveTaxData(property.id, scrapeResult.data)
            taxDataRefreshed = true
            
            // Refresh property data with new tax information
            property = await prisma.property.findUnique({
              where: { id: property.id },
              include: {
                tax_assessments: { orderBy: { assessment_year: 'desc' }, take: 5 },
                tax_payments: { orderBy: { tax_year: 'desc' }, take: 5 }
              }
            })!
          }

          await scraper.closeBrowser()
        } catch (error) {
          console.warn('Tax data refresh failed:', error)
          // Continue with analysis using existing data
        }
      }
    }

    // Enhance financials with tax data if not provided
    const enhancedFinancials: PropertyFinancials = {
      purchasePrice: financials.purchasePrice,
      downPaymentPercent: financials.downPaymentPercent || 25,
      interestRate: financials.interestRate || 7.0,
      loanTermYears: financials.loanTermYears || 30,
      grossRentalIncome: financials.grossRentalIncome,
      vacancyRate: financials.vacancyRate || 5,
      propertyManagement: financials.propertyManagement || (financials.grossRentalIncome * 0.08),
      maintenanceRepairs: financials.maintenanceRepairs || (financials.grossRentalIncome * 0.05),
      insurance: financials.insurance || (financials.purchasePrice * 0.003),
      utilities: financials.utilities || 0,
      otherExpenses: financials.otherExpenses || 0,
      propertyTaxes: financials.propertyTaxes
    }

    // Use tax data for property taxes if not provided
    if (!enhancedFinancials.propertyTaxes && property.tax_assessments.length > 0) {
      const latestAssessment = property.tax_assessments[0]
      if (latestAssessment.annual_taxes) {
        enhancedFinancials.propertyTaxes = latestAssessment.annual_taxes
      } else if (latestAssessment.assessed_value && latestAssessment.tax_rate) {
        enhancedFinancials.propertyTaxes = latestAssessment.assessed_value * latestAssessment.tax_rate
      }
    }

    // Estimate property taxes if still not available
    if (!enhancedFinancials.propertyTaxes) {
      // Use national average of ~1.1% of purchase price
      enhancedFinancials.propertyTaxes = financials.purchasePrice * 0.011
    }

    // Perform enhanced analysis
    const analysis = await EnhancedUnderwritingCalculator.analyzeProperty(
      property.id, 
      enhancedFinancials
    )

    // Calculate additional metrics
    const breakEvenRent = EnhancedUnderwritingCalculator.calculateBreakEvenRent(enhancedFinancials)
    const maxPurchasePrice = EnhancedUnderwritingCalculator.calculateMaxPurchasePrice(
      enhancedFinancials, 
      0.10 // 10% target cash-on-cash return
    )

    // Prepare response
    const response = {
      property: {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip_code,
        county: property.county,
        units: property.units,
        sq_ft: property.sq_ft,
        year_built: property.year_built,
        property_type: property.property_type
      },
      
      financials: enhancedFinancials,
      
      analysis: {
        ...analysis,
        break_even_rent: breakEvenRent,
        max_purchase_price_for_10_percent_return: maxPurchasePrice
      },
      
      tax_data: include_tax_data ? {
        assessments: property.tax_assessments,
        payments: property.tax_payments,
        last_updated: property.last_tax_update,
        refreshed: taxDataRefreshed
      } : null,
      
      calculated_at: new Date(),
      
      // Data quality indicators
      data_quality: {
        address_confidence: normalizedAddress.confidenceScore || 0.5,
        tax_data_available: property.tax_assessments.length > 0,
        tax_data_recent: property.last_tax_update ? 
          (Date.now() - property.last_tax_update.getTime()) < (90 * 24 * 60 * 60 * 1000) : false,
        estimated_values: {
          property_taxes: !financials.propertyTaxes,
          property_management: !financials.propertyManagement,
          maintenance_repairs: !financials.maintenanceRepairs,
          insurance: !financials.insurance
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Enhanced analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during property analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving saved analyses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const limit = Number.parseInt(searchParams.get('limit') || '10')

    if (propertyId) {
      // Get analyses for specific property
      const analyses = await prisma.underwritingAnalysis.findMany({
        where: { property_id: propertyId },
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              zip_code: true
            }
          }
        }
      })

      return NextResponse.json({ analyses })
    } else {
      // Get recent analyses across all properties
      const analyses = await prisma.underwritingAnalysis.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              zip_code: true
            }
          }
        }
      })

      return NextResponse.json({ analyses })
    }

  } catch (error) {
    console.error('Error fetching analyses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}