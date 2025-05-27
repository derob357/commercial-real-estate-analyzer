import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id
    const { searchParams } = new URL(request.url)
    const years = Number.parseInt(searchParams.get('years') || '5')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        county: true
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Get tax assessments
    const assessments = await prisma.taxAssessment.findMany({
      where: { property_id: propertyId },
      orderBy: { assessment_year: 'desc' },
      take: years
    })

    // Get tax payments
    const payments = await prisma.taxPayment.findMany({
      where: { property_id: propertyId },
      orderBy: { tax_year: 'desc' },
      take: years * 2 // May have multiple payments per year
    })

    // Calculate tax trends
    const taxTrends = this.calculateTaxTrends(assessments, payments)

    // Organize data by year
    const yearlyData = this.organizeByYear(assessments, payments)

    return NextResponse.json({
      property,
      tax_history: {
        assessments,
        payments,
        yearly_data: yearlyData,
        trends: taxTrends,
        summary: {
          total_years: assessments.length,
          latest_assessment: assessments[0] || null,
          latest_payment: payments[0] || null,
          average_annual_tax: this.calculateAverageAnnualTax(assessments),
          tax_growth_rate: taxTrends.assessment_trend
        }
      }
    })

  } catch (error) {
    console.error('Error fetching tax history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateTaxTrends(assessments: any[], payments: any[]) {
  if (assessments.length < 2) {
    return {
      assessment_trend: 0,
      tax_trend: 0,
      years_analyzed: assessments.length
    }
  }

  // Sort by year ascending for trend calculation
  const sortedAssessments = [...assessments].sort((a, b) => a.assessment_year - b.assessment_year)
  const sortedPayments = [...payments].sort((a, b) => a.tax_year - b.tax_year)

  // Calculate assessment value trend (annual growth rate)
  const firstAssessment = sortedAssessments[0]
  const lastAssessment = sortedAssessments[sortedAssessments.length - 1]
  const assessmentYears = lastAssessment.assessment_year - firstAssessment.assessment_year
  
  let assessmentTrend = 0
  if (assessmentYears > 0 && firstAssessment.assessed_value && lastAssessment.assessed_value) {
    assessmentTrend = Math.pow(
      lastAssessment.assessed_value / firstAssessment.assessed_value,
      1 / assessmentYears
    ) - 1
  }

  // Calculate tax payment trend
  const validPayments = sortedPayments.filter(p => p.amount_paid > 0)
  let taxTrend = 0
  
  if (validPayments.length >= 2) {
    const firstPayment = validPayments[0]
    const lastPayment = validPayments[validPayments.length - 1]
    const paymentYears = lastPayment.tax_year - firstPayment.tax_year
    
    if (paymentYears > 0) {
      taxTrend = Math.pow(
        lastPayment.amount_paid / firstPayment.amount_paid,
        1 / paymentYears
      ) - 1
    }
  }

  return {
    assessment_trend: assessmentTrend,
    tax_trend: taxTrend,
    years_analyzed: assessmentYears
  }
}

function organizeByYear(assessments: any[], payments: any[]) {
  const yearlyData: { [year: number]: any } = {}

  // Add assessments by year
  assessments.forEach(assessment => {
    const year = assessment.assessment_year
    if (!yearlyData[year]) {
      yearlyData[year] = { year, assessment: null, payments: [] }
    }
    yearlyData[year].assessment = assessment
  })

  // Add payments by year
  payments.forEach(payment => {
    const year = payment.tax_year
    if (!yearlyData[year]) {
      yearlyData[year] = { year, assessment: null, payments: [] }
    }
    yearlyData[year].payments.push(payment)
  })

  // Convert to array and sort by year descending
  return Object.values(yearlyData).sort((a: any, b: any) => b.year - a.year)
}

function calculateAverageAnnualTax(assessments: any[]) {
  const validAssessments = assessments.filter(a => a.annual_taxes > 0)
  if (validAssessments.length === 0) return 0
  
  const total = validAssessments.reduce((sum, a) => sum + a.annual_taxes, 0)
  return total / validAssessments.length
}