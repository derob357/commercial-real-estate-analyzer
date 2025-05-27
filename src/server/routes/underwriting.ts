import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';
import { PropertyAnalysisService } from '../services/PropertyAnalysisService';

const router = express.Router();
const propertyAnalysis = new PropertyAnalysisService();

// Validation schemas
const underwritingSchema = z.object({
  property_id: z.string(),
  purchase_price: z.number().positive(),
  down_payment_percent: z.number().min(0).max(1),
  interest_rate: z.number().min(0).max(1),
  loan_term_years: z.number().min(1).max(50),
  gross_rental_income: z.number().min(0),
  vacancy_rate: z.number().min(0).max(1).default(0.05),
  annual_expenses: z.number().min(0)
});

const scenarioSchema = z.object({
  property_id: z.string(),
  scenarios: z.array(z.object({
    name: z.string(),
    purchase_price: z.number().positive(),
    down_payment_percent: z.number().min(0).max(1),
    interest_rate: z.number().min(0).max(1),
    loan_term_years: z.number().min(1).max(50),
    year_1_gross_income: z.number().min(0),
    annual_rent_growth: z.number().min(-0.1).max(0.2),
    vacancy_rate: z.number().min(0).max(1),
    year_1_expenses: z.number().min(0),
    annual_expense_growth: z.number().min(0).max(0.2),
    capex_reserve_percent: z.number().min(0).max(0.2),
    exit_year: z.number().min(1).max(30).optional(),
    exit_cap_rate: z.number().min(0).max(1).optional(),
    selling_costs_percent: z.number().min(0).max(0.2).optional()
  })).min(1).max(5)
});

/**
 * POST /api/underwriting/analyze
 * Perform comprehensive underwriting analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const analysisParams = underwritingSchema.parse(req.body);
    
    // Get property with tax data
    const property = await prisma.property.findUnique({
      where: { id: analysisParams.property_id },
      include: {
        tax_assessments: {
          orderBy: { assessment_year: 'desc' },
          take: 3
        },
        tax_payments: {
          orderBy: { tax_year: 'desc' },
          take: 3
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Perform analysis
    const analysis = await propertyAnalysis.performComprehensiveAnalysis({
      property,
      ...analysisParams
    });

    // Save analysis to database
    const savedAnalysis = await prisma.underwritingAnalysis.create({
      data: {
        property_id: property.id,
        purchase_price: analysisParams.purchase_price,
        down_payment_percent: analysisParams.down_payment_percent,
        loan_amount: analysisParams.purchase_price * (1 - analysisParams.down_payment_percent),
        interest_rate: analysisParams.interest_rate,
        loan_term_years: analysisParams.loan_term_years,
        gross_rental_income: analysisParams.gross_rental_income,
        vacancy_rate: analysisParams.vacancy_rate,
        effective_gross_income: analysisParams.gross_rental_income * (1 - analysisParams.vacancy_rate),
        total_expenses: analysisParams.annual_expenses,
        net_operating_income: analysis.noi,
        cap_rate: analysis.capRate,
        cash_flow: analysis.cashFlow,
        cash_on_cash_return: analysis.cashOnCashReturn,
        debt_service_coverage: analysis.dscr,
        effective_tax_rate: analysis.effectiveTaxRate,
        tax_assessed_vs_market: analysis.taxAssessedVsMarket,
        tax_trend_3_year: analysis.taxTrend3Year,
        tax_appeal_potential: analysis.taxAppealPotential
      }
    });

    res.json({
      analysis_id: savedAnalysis.id,
      property,
      analysis,
      created_at: savedAnalysis.analysis_date
    });

  } catch (error) {
    logger.error('Underwriting analysis failed:', error);
    res.status(400).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/underwriting/scenarios
 * Create and analyze multiple scenarios
 */
router.post('/scenarios', async (req, res) => {
  try {
    const scenarioParams = scenarioSchema.parse(req.body);
    
    const property = await prisma.property.findUnique({
      where: { id: scenarioParams.property_id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const scenarioResults = [];

    for (const scenario of scenarioParams.scenarios) {
      try {
        const analysis = await propertyAnalysis.performScenarioAnalysis(property, scenario);
        
        const savedScenario = await prisma.financialScenario.create({
          data: {
            property_id: property.id,
            scenario_name: scenario.name,
            purchase_price: scenario.purchase_price,
            down_payment_percent: scenario.down_payment_percent,
            interest_rate: scenario.interest_rate,
            loan_term_years: scenario.loan_term_years,
            year_1_gross_income: scenario.year_1_gross_income,
            annual_rent_growth: scenario.annual_rent_growth,
            vacancy_rate: scenario.vacancy_rate,
            year_1_expenses: scenario.year_1_expenses,
            annual_expense_growth: scenario.annual_expense_growth,
            capex_reserve_percent: scenario.capex_reserve_percent,
            exit_year: scenario.exit_year,
            exit_cap_rate: scenario.exit_cap_rate,
            selling_costs_percent: scenario.selling_costs_percent,
            irr: analysis.irr,
            npv: analysis.npv,
            equity_multiple: analysis.equityMultiple,
            average_coc_return: analysis.averageCocReturn,
            break_even_occupancy: analysis.breakEvenOccupancy,
            sensitivity_score: analysis.sensitivityScore
          }
        });

        scenarioResults.push({
          scenario_id: savedScenario.id,
          scenario_name: scenario.name,
          analysis,
          cash_flow_projections: analysis.cashFlowProjections
        });

      } catch (error) {
        logger.error(`Scenario analysis failed for ${scenario.name}:`, error);
        scenarioResults.push({
          scenario_name: scenario.name,
          error: 'Analysis failed'
        });
      }
    }

    res.json({
      property_id: scenarioParams.property_id,
      scenarios: scenarioResults,
      total_scenarios: scenarioResults.length,
      successful_scenarios: scenarioResults.filter(s => !s.error).length
    });

  } catch (error) {
    logger.error('Scenario analysis failed:', error);
    res.status(400).json({ error: 'Scenario analysis failed' });
  }
});

/**
 * GET /api/underwriting/:property_id/history
 * Get underwriting analysis history for a property
 */
router.get('/:property_id/history', async (req, res) => {
  try {
    const { property_id } = req.params;

    const analyses = await prisma.underwritingAnalysis.findMany({
      where: { property_id },
      orderBy: { analysis_date: 'desc' },
      take: 10
    });

    const scenarios = await prisma.financialScenario.findMany({
      where: { property_id },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    res.json({
      property_id,
      analyses,
      scenarios,
      total_analyses: analyses.length,
      total_scenarios: scenarios.length
    });

  } catch (error) {
    logger.error('Underwriting history retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve underwriting history' });
  }
});

/**
 * GET /api/underwriting/analysis/:analysis_id
 * Get specific underwriting analysis
 */
router.get('/analysis/:analysis_id', async (req, res) => {
  try {
    const { analysis_id } = req.params;

    const analysis = await prisma.underwritingAnalysis.findUnique({
      where: { id: analysis_id },
      include: {
        property: {
          include: {
            tax_assessments: {
              orderBy: { assessment_year: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(analysis);

  } catch (error) {
    logger.error('Analysis retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis' });
  }
});

/**
 * GET /api/underwriting/scenario/:scenario_id
 * Get specific scenario analysis
 */
router.get('/scenario/:scenario_id', async (req, res) => {
  try {
    const { scenario_id } = req.params;

    const scenario = await prisma.financialScenario.findUnique({
      where: { id: scenario_id },
      include: {
        property: true
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);

  } catch (error) {
    logger.error('Scenario retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve scenario' });
  }
});

/**
 * POST /api/underwriting/compare
 * Compare multiple properties or scenarios
 */
router.post('/compare', async (req, res) => {
  try {
    const { analysis_ids, scenario_ids, property_ids } = req.body;

    const comparison: any = {
      analyses: [],
      scenarios: [],
      properties: []
    };

    if (analysis_ids && Array.isArray(analysis_ids)) {
      comparison.analyses = await prisma.underwritingAnalysis.findMany({
        where: { id: { in: analysis_ids } },
        include: { property: true }
      });
    }

    if (scenario_ids && Array.isArray(scenario_ids)) {
      comparison.scenarios = await prisma.financialScenario.findMany({
        where: { id: { in: scenario_ids } },
        include: { property: true }
      });
    }

    if (property_ids && Array.isArray(property_ids)) {
      comparison.properties = await prisma.property.findMany({
        where: { id: { in: property_ids } },
        include: {
          underwriting_analysis: {
            orderBy: { analysis_date: 'desc' },
            take: 1
          },
          financial_scenarios: {
            orderBy: { created_at: 'desc' },
            take: 3
          }
        }
      });
    }

    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(comparison);

    res.json({
      comparison,
      metrics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Comparison failed:', error);
    res.status(500).json({ error: 'Failed to generate comparison' });
  }
});

// Helper function to calculate comparison metrics
function calculateComparisonMetrics(comparison: any) {
  const metrics: any = {
    analysis_summary: null,
    scenario_summary: null,
    property_summary: null
  };

  // Analysis comparison
  if (comparison.analyses.length > 0) {
    const analyses = comparison.analyses;
    metrics.analysis_summary = {
      count: analyses.length,
      avg_cap_rate: analyses.reduce((sum: number, a: any) => sum + (a.cap_rate || 0), 0) / analyses.length,
      avg_cash_on_cash: analyses.reduce((sum: number, a: any) => sum + (a.cash_on_cash_return || 0), 0) / analyses.length,
      avg_dscr: analyses.reduce((sum: number, a: any) => sum + (a.debt_service_coverage || 0), 0) / analyses.length,
      price_range: {
        min: Math.min(...analyses.map((a: any) => a.purchase_price || 0)),
        max: Math.max(...analyses.map((a: any) => a.purchase_price || 0))
      }
    };
  }

  // Scenario comparison
  if (comparison.scenarios.length > 0) {
    const scenarios = comparison.scenarios;
    metrics.scenario_summary = {
      count: scenarios.length,
      avg_irr: scenarios.reduce((sum: number, s: any) => sum + (s.irr || 0), 0) / scenarios.length,
      avg_npv: scenarios.reduce((sum: number, s: any) => sum + (s.npv || 0), 0) / scenarios.length,
      avg_equity_multiple: scenarios.reduce((sum: number, s: any) => sum + (s.equity_multiple || 0), 0) / scenarios.length,
      best_irr: Math.max(...scenarios.map((s: any) => s.irr || 0)),
      worst_irr: Math.min(...scenarios.map((s: any) => s.irr || 0))
    };
  }

  return metrics;
}

export default router;