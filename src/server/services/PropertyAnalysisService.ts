import { PrismaClient, type Property, type TaxAssessment, type TaxPayment } from '@prisma/client';
import { logger } from '../index';

interface AnalysisParams {
  property: Property & {
    tax_assessments: TaxAssessment[];
    tax_payments: TaxPayment[];
  };
  purchase_price: number;
  down_payment_percent: number;
  interest_rate: number;
  loan_term_years: number;
  gross_rental_income: number;
  vacancy_rate: number;
  annual_expenses: number;
}

interface AnalysisResult {
  // Core Metrics
  noi: number;
  capRate: number;
  cashFlow: number;
  cashOnCashReturn: number;
  dscr: number;
  grm: number;
  pricePerUnit: number;
  pricePerSqft: number;
  
  // Tax-Enhanced Metrics
  effectiveTaxRate: number;
  taxAssessedVsMarket: number;
  taxTrend3Year: number;
  taxAppealPotential: boolean;
  
  // Risk Assessment
  breakEvenOccupancy: number;
  sensitivityScore: number;
  riskScore: number;
  
  // Market Comparison
  marketCapRateComparison: number;
  marketPriceComparison: number;
  marketScoreVsAverage: number;
}

interface ScenarioParams {
  name: string;
  purchase_price: number;
  down_payment_percent: number;
  interest_rate: number;
  loan_term_years: number;
  year_1_gross_income: number;
  annual_rent_growth: number;
  vacancy_rate: number;
  year_1_expenses: number;
  annual_expense_growth: number;
  capex_reserve_percent: number;
  exit_year?: number;
  exit_cap_rate?: number;
  selling_costs_percent?: number;
}

interface ScenarioResult {
  irr: number;
  npv: number;
  equityMultiple: number;
  averageCocReturn: number;
  breakEvenOccupancy: number;
  sensitivityScore: number;
  cashFlowProjections: Array<{
    year: number;
    grossIncome: number;
    expenses: number;
    noi: number;
    debtService: number;
    cashFlow: number;
    cumulativeCashFlow: number;
  }>;
}

export class PropertyAnalysisService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Perform comprehensive property analysis with tax integration
   */
  async performComprehensiveAnalysis(params: AnalysisParams): Promise<AnalysisResult> {
    try {
      const {
        property,
        purchase_price,
        down_payment_percent,
        interest_rate,
        loan_term_years,
        gross_rental_income,
        vacancy_rate,
        annual_expenses
      } = params;

      // Core Financial Calculations
      const effectiveGrossIncome = gross_rental_income * (1 - vacancy_rate);
      const noi = effectiveGrossIncome - annual_expenses;
      const capRate = noi / purchase_price;
      
      // Loan Calculations
      const loanAmount = purchase_price * (1 - down_payment_percent);
      const monthlyRate = interest_rate / 12;
      const numPayments = loan_term_years * 12;
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const annualDebtService = monthlyPayment * 12;
      
      const cashFlow = noi - annualDebtService;
      const cashInvested = purchase_price * down_payment_percent;
      const cashOnCashReturn = cashFlow / cashInvested;
      const dscr = noi / annualDebtService;
      
      // Additional Metrics
      const grm = purchase_price / gross_rental_income;
      const pricePerUnit = property.units ? purchase_price / property.units : 0;
      const pricePerSqft = property.sq_ft ? purchase_price / property.sq_ft : 0;

      // Tax Analysis
      const taxAnalysis = this.calculateTaxMetrics(property, purchase_price);
      
      // Risk Assessment
      const riskMetrics = this.calculateRiskMetrics({
        noi,
        annualDebtService,
        vacancy_rate,
        capRate,
        dscr
      });

      // Market Comparison
      const marketComparison = await this.getMarketComparison(property, {
        capRate,
        pricePerUnit,
        pricePerSqft
      });

      return {
        // Core Metrics
        noi,
        capRate,
        cashFlow,
        cashOnCashReturn,
        dscr,
        grm,
        pricePerUnit,
        pricePerSqft,
        
        // Tax-Enhanced Metrics
        effectiveTaxRate: taxAnalysis.effectiveTaxRate,
        taxAssessedVsMarket: taxAnalysis.taxAssessedVsMarket,
        taxTrend3Year: taxAnalysis.taxTrend3Year,
        taxAppealPotential: taxAnalysis.taxAppealPotential,
        
        // Risk Assessment
        breakEvenOccupancy: riskMetrics.breakEvenOccupancy,
        sensitivityScore: riskMetrics.sensitivityScore,
        riskScore: riskMetrics.riskScore,
        
        // Market Comparison
        marketCapRateComparison: marketComparison.capRateComparison,
        marketPriceComparison: marketComparison.priceComparison,
        marketScoreVsAverage: marketComparison.scoreVsAverage
      };

    } catch (error) {
      logger.error('Property analysis failed:', error);
      throw new Error('Failed to perform property analysis');
    }
  }

  /**
   * Perform 10-year scenario analysis with IRR and NPV calculations
   */
  async performScenarioAnalysis(property: Property, scenario: ScenarioParams): Promise<ScenarioResult> {
    try {
      const projectionYears = scenario.exit_year || 10;
      const cashFlowProjections = [];
      let cumulativeCashFlow = 0;

      // Initial investment
      const initialInvestment = scenario.purchase_price * scenario.down_payment_percent;
      
      // Loan calculations
      const loanAmount = scenario.purchase_price * (1 - scenario.down_payment_percent);
      const monthlyRate = scenario.interest_rate / 12;
      const numPayments = scenario.loan_term_years * 12;
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const annualDebtService = monthlyPayment * 12;

      // Year-by-year projections
      for (let year = 1; year <= projectionYears; year++) {
        const grossIncome = scenario.year_1_gross_income * 
          Math.pow(1 + scenario.annual_rent_growth, year - 1);
        
        const effectiveGrossIncome = grossIncome * (1 - scenario.vacancy_rate);
        
        const expenses = scenario.year_1_expenses * 
          Math.pow(1 + scenario.annual_expense_growth, year - 1);
        
        const capexReserve = grossIncome * scenario.capex_reserve_percent;
        const totalExpenses = expenses + capexReserve;
        
        const noi = effectiveGrossIncome - totalExpenses;
        const cashFlow = noi - annualDebtService;
        cumulativeCashFlow += cashFlow;

        cashFlowProjections.push({
          year,
          grossIncome,
          expenses: totalExpenses,
          noi,
          debtService: annualDebtService,
          cashFlow,
          cumulativeCashFlow
        });
      }

      // Exit value calculation
      let exitValue = 0;
      if (scenario.exit_year && scenario.exit_cap_rate) {
        const finalYearNoi = cashFlowProjections[scenario.exit_year - 1].noi;
        const grossSalePrice = finalYearNoi / scenario.exit_cap_rate;
        const sellingCosts = grossSalePrice * (scenario.selling_costs_percent || 0.06);
        exitValue = grossSalePrice - sellingCosts;
      }

      // IRR Calculation
      const irr = this.calculateIRR(initialInvestment, cashFlowProjections, exitValue);
      
      // NPV Calculation (using 10% discount rate)
      const discountRate = 0.10;
      const npv = this.calculateNPV(initialInvestment, cashFlowProjections, exitValue, discountRate);
      
      // Equity Multiple
      const totalCashReceived = cumulativeCashFlow + exitValue;
      const equityMultiple = totalCashReceived / initialInvestment;
      
      // Average Cash-on-Cash Return
      const averageCocReturn = cashFlowProjections.reduce((sum, cf) => sum + cf.cashFlow, 0) / 
        (projectionYears * initialInvestment);

      // Break-even occupancy
      const avgNoi = cashFlowProjections.reduce((sum, cf) => sum + cf.noi, 0) / projectionYears;
      const avgGrossIncome = cashFlowProjections.reduce((sum, cf) => sum + cf.grossIncome, 0) / projectionYears;
      const avgExpenses = cashFlowProjections.reduce((sum, cf) => sum + cf.expenses, 0) / projectionYears;
      const breakEvenOccupancy = (avgExpenses + annualDebtService) / avgGrossIncome;

      // Sensitivity Score (higher = more sensitive to assumptions)
      const sensitivityScore = this.calculateSensitivityScore({
        irr,
        rent_growth: scenario.annual_rent_growth,
        vacancy_rate: scenario.vacancy_rate,
        expense_growth: scenario.annual_expense_growth
      });

      return {
        irr,
        npv,
        equityMultiple,
        averageCocReturn,
        breakEvenOccupancy,
        sensitivityScore,
        cashFlowProjections
      };

    } catch (error) {
      logger.error('Scenario analysis failed:', error);
      throw new Error('Failed to perform scenario analysis');
    }
  }

  /**
   * Calculate tax-related metrics and analysis
   */
  private calculateTaxMetrics(property: Property & { tax_assessments: TaxAssessment[]; tax_payments: TaxPayment[] }, purchasePrice: number) {
    const latestAssessment = property.tax_assessments[0];
    const recentPayments = property.tax_payments.slice(0, 3);

    // Effective tax rate from actual payments
    let effectiveTaxRate = 0;
    if (recentPayments.length > 0 && latestAssessment?.assessed_value) {
      const avgAnnualTax = recentPayments.reduce((sum, payment) => 
        sum + (payment.amount_paid || 0), 0) / recentPayments.length;
      effectiveTaxRate = avgAnnualTax / latestAssessment.assessed_value;
    }

    // Tax assessed vs market value ratio
    const taxAssessedVsMarket = latestAssessment?.assessed_value ? 
      latestAssessment.assessed_value / purchasePrice : 0;

    // 3-year tax trend
    let taxTrend3Year = 0;
    if (property.tax_assessments.length >= 3) {
      const oldestAssessment = property.tax_assessments[2];
      const latestValue = latestAssessment?.assessed_value || 0;
      const oldestValue = oldestAssessment?.assessed_value || 0;
      
      if (oldestValue > 0) {
        taxTrend3Year = ((latestValue - oldestValue) / oldestValue) / 3; // Annualized
      }
    }

    // Tax appeal potential (if assessed significantly higher than market)
    const taxAppealPotential = taxAssessedVsMarket > 1.15; // 15% higher than purchase price

    return {
      effectiveTaxRate,
      taxAssessedVsMarket,
      taxTrend3Year,
      taxAppealPotential
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(params: {
    noi: number;
    annualDebtService: number;
    vacancy_rate: number;
    capRate: number;
    dscr: number;
  }) {
    const { noi, annualDebtService, vacancy_rate, capRate, dscr } = params;

    // Break-even occupancy rate
    const breakEvenOccupancy = (annualDebtService / noi) * (1 - vacancy_rate);

    // Sensitivity score (1-10, higher = more risky)
    let sensitivityScore = 5; // Base score
    
    if (dscr < 1.2) sensitivityScore += 2;
    else if (dscr < 1.5) sensitivityScore += 1;
    else if (dscr > 2.0) sensitivityScore -= 1;
    
    if (capRate < 0.04) sensitivityScore += 2;
    else if (capRate < 0.06) sensitivityScore += 1;
    else if (capRate > 0.10) sensitivityScore -= 1;
    
    if (vacancy_rate > 0.10) sensitivityScore += 1;
    else if (vacancy_rate < 0.03) sensitivityScore -= 1;

    // Overall risk score
    const riskScore = Math.max(1, Math.min(10, sensitivityScore));

    return {
      breakEvenOccupancy,
      sensitivityScore,
      riskScore
    };
  }

  /**
   * Get market comparison data
   */
  private async getMarketComparison(property: Property, metrics: {
    capRate: number;
    pricePerUnit: number;
    pricePerSqft: number;
  }) {
    try {
      // Get market data for the zip code
      const marketData = await this.prisma.marketData.findMany({
        where: {
          zip_code: property.zip_code,
          data_source: { in: ['realtyrates', 'marcus_millichap'] }
        },
        orderBy: { measurement_date: 'desc' },
        take: 5
      });

      let capRateComparison = 0;
      let priceComparison = 0;

      if (marketData.length > 0) {
        const avgMarketCapRate = marketData.reduce((sum, data) => 
          sum + (data.multifamily_cap_rate || 0), 0) / marketData.length;
        
        const avgMarketRent = marketData.reduce((sum, data) => 
          sum + (data.avg_rent_per_unit || 0), 0) / marketData.length;

        capRateComparison = avgMarketCapRate > 0 ? 
          (metrics.capRate - avgMarketCapRate) / avgMarketCapRate : 0;
        
        priceComparison = avgMarketRent > 0 ? 
          (metrics.pricePerUnit - avgMarketRent * 100) / (avgMarketRent * 100) : 0;
      }

      // Calculate overall market score vs average
      const scoreVsAverage = (capRateComparison + priceComparison) / 2;

      return {
        capRateComparison,
        priceComparison,
        scoreVsAverage
      };

    } catch (error) {
      logger.error('Market comparison failed:', error);
      return { capRateComparison: 0, priceComparison: 0, scoreVsAverage: 0 };
    }
  }

  /**
   * Get market context for a zip code
   */
  async getMarketContext(zipCode: string) {
    try {
      const marketData = await this.prisma.marketData.findMany({
        where: { zip_code: zipCode },
        orderBy: { measurement_date: 'desc' },
        take: 10
      });

      const economicIndicators = await this.prisma.economicIndicator.findMany({
        where: {
          OR: [
            { metro_area: { contains: zipCode } },
            { state: zipCode.substring(0, 2) }
          ]
        },
        orderBy: { measurement_date: 'desc' },
        take: 10
      });

      return {
        marketData,
        economicIndicators,
        summary: {
          avgCapRate: marketData.reduce((sum, data) => sum + (data.multifamily_cap_rate || 0), 0) / Math.max(marketData.length, 1),
          avgRent: marketData.reduce((sum, data) => sum + (data.avg_rent_per_unit || 0), 0) / Math.max(marketData.length, 1),
          vacancyRate: marketData.reduce((sum, data) => sum + (data.vacancy_rate || 0), 0) / Math.max(marketData.length, 1)
        }
      };
    } catch (error) {
      logger.error('Market context retrieval failed:', error);
      return null;
    }
  }

  /**
   * Calculate IRR using Newton-Raphson method
   */
  private calculateIRR(initialInvestment: number, cashFlows: any[], exitValue: number): number {
    const totalCashFlows = [-initialInvestment];
    
    cashFlows.forEach((cf, index) => {
      if (index === cashFlows.length - 1) {
        totalCashFlows.push(cf.cashFlow + exitValue);
      } else {
        totalCashFlows.push(cf.cashFlow);
      }
    });

    // Newton-Raphson method for IRR calculation
    let rate = 0.1; // Initial guess
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      for (let t = 0; t < totalCashFlows.length; t++) {
        npv += totalCashFlows[t] / Math.pow(1 + rate, t);
        if (t > 0) {
          derivative -= t * totalCashFlows[t] / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(npv) < tolerance) {
        return rate;
      }

      if (derivative === 0) {
        break;
      }

      rate = rate - npv / derivative;
    }

    return rate;
  }

  /**
   * Calculate NPV
   */
  private calculateNPV(initialInvestment: number, cashFlows: any[], exitValue: number, discountRate: number): number {
    let npv = -initialInvestment;

    cashFlows.forEach((cf, index) => {
      const year = index + 1;
      if (index === cashFlows.length - 1) {
        npv += (cf.cashFlow + exitValue) / Math.pow(1 + discountRate, year);
      } else {
        npv += cf.cashFlow / Math.pow(1 + discountRate, year);
      }
    });

    return npv;
  }

  /**
   * Calculate sensitivity score
   */
  private calculateSensitivityScore(params: {
    irr: number;
    rent_growth: number;
    vacancy_rate: number;
    expense_growth: number;
  }): number {
    const { irr, rent_growth, vacancy_rate, expense_growth } = params;

    // Base sensitivity (1-10 scale)
    let score = 5;

    // IRR sensitivity
    if (irr < 0.08) score += 2;
    else if (irr < 0.12) score += 1;
    else if (irr > 0.20) score -= 1;

    // Rent growth sensitivity
    if (rent_growth < 0.02) score += 1;
    else if (rent_growth > 0.05) score += 1;

    // Vacancy rate sensitivity
    if (vacancy_rate > 0.10) score += 1;
    else if (vacancy_rate < 0.03) score -= 1;

    // Expense growth sensitivity
    if (expense_growth > 0.04) score += 1;

    return Math.max(1, Math.min(10, score));
  }
}