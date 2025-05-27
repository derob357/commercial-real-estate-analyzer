import { prisma } from '../database'

export interface PropertyFinancials {
  purchasePrice: number
  downPaymentPercent: number
  interestRate: number
  loanTermYears: number
  grossRentalIncome: number
  vacancyRate: number
  
  // Operating Expenses
  propertyManagement?: number
  maintenanceRepairs?: number
  insurance?: number
  utilities?: number
  otherExpenses?: number
  
  // Will be calculated from tax data if not provided
  propertyTaxes?: number
}

export interface TaxEnhancedMetrics {
  // Standard Metrics
  netOperatingIncome: number
  capRate: number
  cashFlow: number
  cashOnCashReturn: number
  debtServiceCoverage: number
  
  // Tax-Enhanced Metrics
  effectiveTaxRate: number
  taxAssessedVsMarket: number
  taxTrend3Year: number
  taxAppealPotential: boolean
  projectedTaxes: number[]
  
  // Risk Indicators
  taxDelinquencyRisk: boolean
  assessmentIncreaseRisk: 'low' | 'medium' | 'high'
  
  // Recommendations
  recommendations: string[]
  warnings: string[]
}

export class EnhancedUnderwritingCalculator {
  
  static async analyzeProperty(
    propertyId: string, 
    financials: PropertyFinancials
  ): Promise<TaxEnhancedMetrics> {
    
    // Get property with tax history
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
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

    if (!property) {
      throw new Error('Property not found')
    }

    // Calculate standard underwriting metrics
    const standardMetrics = this.calculateStandardMetrics(financials)
    
    // Calculate tax-enhanced metrics
    const taxMetrics = await this.calculateTaxMetrics(property, financials)
    
    // Generate recommendations and warnings
    const recommendations = this.generateRecommendations(property, financials, taxMetrics)
    const warnings = this.generateWarnings(property, financials, taxMetrics)
    
    // Save analysis to database
    await this.saveAnalysis(propertyId, financials, {
      ...standardMetrics,
      ...taxMetrics,
      recommendations,
      warnings
    })

    return {
      ...standardMetrics,
      ...taxMetrics,
      recommendations,
      warnings
    }
  }

  private static calculateStandardMetrics(financials: PropertyFinancials) {
    const loanAmount = financials.purchasePrice * (1 - financials.downPaymentPercent / 100)
    const downPayment = financials.purchasePrice * (financials.downPaymentPercent / 100)
    
    // Monthly payment calculation
    const monthlyRate = financials.interestRate / 100 / 12
    const numPayments = financials.loanTermYears * 12
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    
    const annualDebtService = monthlyPayment * 12
    
    // Income calculations
    const effectiveGrossIncome = financials.grossRentalIncome * (1 - financials.vacancyRate / 100)
    
    // Expense calculations
    const totalExpenses = (financials.propertyTaxes || 0) +
                         (financials.insurance || 0) +
                         (financials.propertyManagement || 0) +
                         (financials.maintenanceRepairs || 0) +
                         (financials.utilities || 0) +
                         (financials.otherExpenses || 0)
    
    const netOperatingIncome = effectiveGrossIncome - totalExpenses
    const cashFlow = netOperatingIncome - annualDebtService
    
    return {
      netOperatingIncome,
      capRate: netOperatingIncome / financials.purchasePrice,
      cashFlow,
      cashOnCashReturn: cashFlow / downPayment,
      debtServiceCoverage: netOperatingIncome / annualDebtService
    }
  }

  private static async calculateTaxMetrics(property: any, financials: PropertyFinancials) {
    const assessments = property.tax_assessments || []
    const payments = property.tax_payments || []
    
    // Calculate effective tax rate from actual payments
    let effectiveTaxRate = 0
    if (payments.length > 0 && assessments.length > 0) {
      const recentPayment = payments[0]
      const recentAssessment = assessments[0]
      
      if (recentPayment.amount_paid && recentAssessment.assessed_value) {
        effectiveTaxRate = recentPayment.amount_paid / recentAssessment.assessed_value
      }
    }
    
    // Calculate assessed vs market value ratio
    let taxAssessedVsMarket = 1
    if (assessments.length > 0 && assessments[0].assessed_value) {
      taxAssessedVsMarket = assessments[0].assessed_value / financials.purchasePrice
    }
    
    // Calculate 3-year tax trend
    const taxTrend3Year = this.calculateTaxTrend(assessments)
    
    // Determine tax appeal potential
    const taxAppealPotential = taxAssessedVsMarket > 1.1 // Assessed 10% higher than market
    
    // Project future taxes
    const projectedTaxes = this.projectFutureTaxes(assessments, payments, 5)
    
    // Assess tax delinquency risk
    const taxDelinquencyRisk = this.assessDelinquencyRisk(payments)
    
    // Assess assessment increase risk
    const assessmentIncreaseRisk = this.assessAssessmentRisk(assessments, property)
    
    return {
      effectiveTaxRate,
      taxAssessedVsMarket,
      taxTrend3Year,
      taxAppealPotential,
      projectedTaxes,
      taxDelinquencyRisk,
      assessmentIncreaseRisk
    }
  }

  private static calculateTaxTrend(assessments: any[]): number {
    if (assessments.length < 3) return 0
    
    // Sort by year ascending
    const sorted = [...assessments].sort((a, b) => a.assessment_year - b.assessment_year)
    const validAssessments = sorted.filter(a => a.assessed_value > 0)
    
    if (validAssessments.length < 3) return 0
    
    // Calculate compound annual growth rate over 3 years
    const first = validAssessments[0]
    const last = validAssessments[validAssessments.length - 1]
    const years = last.assessment_year - first.assessment_year
    
    if (years === 0) return 0
    
    return Math.pow(last.assessed_value / first.assessed_value, 1 / years) - 1
  }

  private static projectFutureTaxes(
    assessments: any[], 
    payments: any[], 
    years: number
  ): number[] {
    const projections: number[] = []
    
    // Use most recent data as baseline
    let baselineTax = 0
    if (payments.length > 0 && payments[0].amount_paid) {
      baselineTax = payments[0].amount_paid
    } else if (assessments.length > 0 && assessments[0].annual_taxes) {
      baselineTax = assessments[0].annual_taxes
    }
    
    // Calculate historical growth rate
    const growthRate = this.calculateTaxTrend(assessments)
    
    // Project future years
    for (let i = 1; i <= years; i++) {
      const projectedTax = baselineTax * Math.pow(1 + growthRate, i)
      projections.push(projectedTax)
    }
    
    return projections
  }

  private static assessDelinquencyRisk(payments: any[]): boolean {
    // Check for any unpaid or late payments
    return payments.some(payment => 
      payment.status === 'unpaid' || 
      payment.status === 'delinquent' ||
      (payment.amount_due && payment.amount_paid && payment.amount_paid < payment.amount_due)
    )
  }

  private static assessAssessmentRisk(assessments: any[], property: any): 'low' | 'medium' | 'high' {
    // Factors that increase assessment risk:
    // 1. High historical growth rate
    // 2. Recent property improvements
    // 3. Gentrifying neighborhood
    // 4. Long time since last assessment
    
    const growthRate = this.calculateTaxTrend(assessments)
    
    if (growthRate > 0.05) return 'high'     // >5% annual growth
    if (growthRate > 0.03) return 'medium'   // >3% annual growth
    return 'low'
  }

  private static generateRecommendations(
    property: any, 
    financials: PropertyFinancials, 
    taxMetrics: any
  ): string[] {
    const recommendations: string[] = []
    
    if (taxMetrics.taxAppealPotential) {
      recommendations.push(
        `Consider filing a tax assessment appeal. Property is assessed ${
          ((taxMetrics.taxAssessedVsMarket - 1) * 100).toFixed(1)
        }% above purchase price.`
      )
    }
    
    if (taxMetrics.taxTrend3Year > 0.04) {
      recommendations.push(
        `Budget for accelerating tax increases. Historical trend shows ${
          (taxMetrics.taxTrend3Year * 100).toFixed(1)
        }% annual growth.`
      )
    }
    
    if (taxMetrics.effectiveTaxRate > 0.025) {
      recommendations.push(
        `High tax rate area (${(taxMetrics.effectiveTaxRate * 100).toFixed(2)}%). ` +
        'Factor into cash flow projections and consider tax-efficient strategies.'
      )
    }
    
    if (taxMetrics.assessmentIncreaseRisk === 'high') {
      recommendations.push(
        'High risk of assessment increases. Consider setting aside additional reserves for tax escalation.'
      )
    }
    
    // Cash flow recommendations
    const cashOnCash = taxMetrics.cashOnCashReturn
    if (cashOnCash < 0.08) {
      recommendations.push(
        `Low cash-on-cash return (${(cashOnCash * 100).toFixed(1)}%). ` +
        'Consider negotiating purchase price or increasing rents.'
      )
    }
    
    if (taxMetrics.debtServiceCoverage < 1.25) {
      recommendations.push(
        'Low debt service coverage ratio. Consider larger down payment or better financing terms.'
      )
    }
    
    return recommendations
  }

  private static generateWarnings(
    property: any, 
    financials: PropertyFinancials, 
    taxMetrics: any
  ): string[] {
    const warnings: string[] = []
    
    if (taxMetrics.taxDelinquencyRisk) {
      warnings.push(
        'WARNING: Property has history of tax delinquency. Verify current tax status before purchase.'
      )
    }
    
    if (taxMetrics.cashFlow < 0) {
      warnings.push(
        `WARNING: Negative cash flow of $${Math.abs(taxMetrics.cashFlow).toLocaleString()} annually.`
      )
    }
    
    if (taxMetrics.debtServiceCoverage < 1.0) {
      warnings.push(
        'WARNING: Property cannot cover debt service with current income projections.'
      )
    }
    
    if (taxMetrics.capRate < 0.04) {
      warnings.push(
        `WARNING: Very low cap rate (${(taxMetrics.capRate * 100).toFixed(1)}%). ` +
        'Property may be overpriced for income potential.'
      )
    }
    
    if (taxMetrics.taxTrend3Year > 0.08) {
      warnings.push(
        `WARNING: Extremely high tax escalation trend (${(taxMetrics.taxTrend3Year * 100).toFixed(1)}% annually). ` +
        'Future cash flows at high risk.'
      )
    }
    
    return warnings
  }

  private static async saveAnalysis(
    propertyId: string, 
    financials: PropertyFinancials, 
    results: any
  ): Promise<void> {
    await prisma.underwritingAnalysis.create({
      data: {
        property_id: propertyId,
        purchase_price: financials.purchasePrice,
        down_payment_percent: financials.downPaymentPercent,
        loan_amount: financials.purchasePrice * (1 - financials.downPaymentPercent / 100),
        interest_rate: financials.interestRate,
        loan_term_years: financials.loanTermYears,
        gross_rental_income: financials.grossRentalIncome,
        vacancy_rate: financials.vacancyRate,
        property_taxes: financials.propertyTaxes,
        insurance: financials.insurance,
        property_management: financials.propertyManagement,
        maintenance_repairs: financials.maintenanceRepairs,
        utilities: financials.utilities,
        other_expenses: financials.otherExpenses,
        net_operating_income: results.netOperatingIncome,
        cap_rate: results.capRate,
        cash_flow: results.cashFlow,
        cash_on_cash_return: results.cashOnCashReturn,
        debt_service_coverage: results.debtServiceCoverage,
        effective_tax_rate: results.effectiveTaxRate,
        tax_assessed_vs_market: results.taxAssessedVsMarket,
        tax_trend_3_year: results.taxTrend3Year,
        tax_appeal_potential: results.taxAppealPotential
      }
    })
  }

  // Utility method to calculate break-even rent
  static calculateBreakEvenRent(financials: PropertyFinancials): number {
    const loanAmount = financials.purchasePrice * (1 - financials.downPaymentPercent / 100)
    const monthlyRate = financials.interestRate / 100 / 12
    const numPayments = financials.loanTermYears * 12
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    
    const monthlyExpenses = ((financials.propertyTaxes || 0) +
                           (financials.insurance || 0) +
                           (financials.propertyManagement || 0) +
                           (financials.maintenanceRepairs || 0) +
                           (financials.utilities || 0) +
                           (financials.otherExpenses || 0)) / 12
    
    const breakEvenBeforeVacancy = monthlyPayment + monthlyExpenses
    const breakEvenRent = breakEvenBeforeVacancy / (1 - financials.vacancyRate / 100)
    
    return breakEvenRent
  }

  // Utility method to calculate maximum purchase price for target return
  static calculateMaxPurchasePrice(
    financials: Omit<PropertyFinancials, 'purchasePrice'>, 
    targetCashOnCash: number
  ): number {
    // Iterative approach to find maximum purchase price
    let low = 100000
    let high = 5000000
    let maxPrice = 0
    
    for (let i = 0; i < 20; i++) { // Max 20 iterations
      const mid = (low + high) / 2
      const testFinancials = { ...financials, purchasePrice: mid }
      const metrics = this.calculateStandardMetrics(testFinancials)
      
      if (metrics.cashOnCashReturn >= targetCashOnCash) {
        maxPrice = mid
        low = mid
      } else {
        high = mid
      }
      
      if (high - low < 1000) break // Converged within $1k
    }
    
    return maxPrice
  }
}