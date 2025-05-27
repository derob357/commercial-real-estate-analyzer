import express from 'express';
import { z } from 'zod';
import { prisma, logger } from '../index';
import { PropertyAnalysisService } from '../services/PropertyAnalysisService';
import { ComparablesService } from '../services/ComparablesService';

const router = express.Router();
const propertyAnalysis = new PropertyAnalysisService();
const comparablesService = new ComparablesService();

// Validation schemas
const propertySearchSchema = z.object({
  zip_code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  property_type: z.string().optional(),
  min_units: z.number().optional(),
  max_units: z.number().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  min_cap_rate: z.number().optional(),
  max_cap_rate: z.number().optional(),
  max_distance_miles: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

const propertyAnalysisSchema = z.object({
  property_id: z.string(),
  purchase_price: z.number().positive(),
  down_payment_percent: z.number().min(0).max(1),
  interest_rate: z.number().min(0).max(1),
  loan_term_years: z.number().min(1).max(50),
  gross_rental_income: z.number().min(0),
  vacancy_rate: z.number().min(0).max(1).default(0.05),
  annual_expenses: z.number().min(0),
  scenarios: z.array(z.enum(['base_case', 'optimistic', 'pessimistic'])).default(['base_case'])
});

/**
 * GET /api/properties/search
 * Advanced property search with filters and geographic radius
 */
router.get('/search', async (req, res) => {
  try {
    const searchParams = propertySearchSchema.parse(req.query);
    
    // Build dynamic where clause
    const whereClause: any = {};
    
    if (searchParams.zip_code) {
      whereClause.zip_code = searchParams.zip_code;
    }
    
    if (searchParams.city) {
      whereClause.city = { contains: searchParams.city, mode: 'insensitive' };
    }
    
    if (searchParams.state) {
      whereClause.state = searchParams.state;
    }
    
    if (searchParams.property_type) {
      whereClause.property_type = searchParams.property_type;
    }
    
    if (searchParams.min_units || searchParams.max_units) {
      whereClause.units = {};
      if (searchParams.min_units) whereClause.units.gte = searchParams.min_units;
      if (searchParams.max_units) whereClause.units.lte = searchParams.max_units;
    }
    
    if (searchParams.min_price || searchParams.max_price) {
      whereClause.listing_price = {};
      if (searchParams.min_price) whereClause.listing_price.gte = searchParams.min_price;
      if (searchParams.max_price) whereClause.listing_price.lte = searchParams.max_price;
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        tax_assessments: {
          take: 1,
          orderBy: { assessment_year: 'desc' }
        },
        underwriting_analysis: {
          take: 1,
          orderBy: { analysis_date: 'desc' }
        }
      },
      take: searchParams.limit,
      skip: searchParams.offset,
      orderBy: { created_at: 'desc' }
    });

    // If geographic search is requested, filter by distance
    let filteredProperties = properties;
    if (searchParams.latitude && searchParams.longitude && searchParams.max_distance_miles) {
      const { getDistance } = await import('geolib');
      filteredProperties = properties.filter(property => {
        if (!property.latitude || !property.longitude) return false;
        
        const distance = getDistance(
          { latitude: searchParams.latitude!, longitude: searchParams.longitude! },
          { latitude: property.latitude, longitude: property.longitude }
        );
        
        return distance <= (searchParams.max_distance_miles! * 1609.34); // Convert miles to meters
      });
    }

    const total = await prisma.property.count({ where: whereClause });

    res.json({
      properties: filteredProperties,
      pagination: {
        total,
        limit: searchParams.limit,
        offset: searchParams.offset,
        hasMore: (searchParams.offset + searchParams.limit) < total
      }
    });

  } catch (error) {
    logger.error('Property search error:', error);
    res.status(400).json({ error: 'Invalid search parameters' });
  }
});

/**
 * POST /api/properties/analyze
 * Comprehensive property financial analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const analysisParams = propertyAnalysisSchema.parse(req.body);
    
    // Get property details
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

    // Perform comprehensive analysis
    const analysis = await propertyAnalysis.performComprehensiveAnalysis({
      property,
      ...analysisParams
    });

    // Get comparable properties
    const comparables = await comparablesService.findComparables(property.id, {
      maxDistance: 5, // 5 miles
      maxResults: 10,
      propertyTypes: [property.property_type || 'multifamily']
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
      property,
      analysis: {
        ...analysis,
        id: savedAnalysis.id
      },
      comparables,
      marketContext: await propertyAnalysis.getMarketContext(property.zip_code)
    });

  } catch (error) {
    logger.error('Property analysis error:', error);
    res.status(400).json({ error: 'Analysis failed' });
  }
});

/**
 * GET /api/properties/:id
 * Get detailed property information
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        tax_assessments: {
          orderBy: { assessment_year: 'desc' }
        },
        tax_payments: {
          orderBy: { tax_year: 'desc' }
        },
        underwriting_analysis: {
          orderBy: { analysis_date: 'desc' }
        },
        financial_scenarios: true,
        comparable_sales: {
          orderBy: { sale_date: 'desc' },
          take: 10
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    logger.error('Get property error:', error);
    res.status(500).json({ error: 'Failed to retrieve property' });
  }
});

/**
 * GET /api/properties/:id/comparables
 * Find comparable properties for analysis
 */
router.get('/:id/comparables', async (req, res) => {
  try {
    const { maxDistance = 5, maxResults = 20, minSimilarityScore = 0.7 } = req.query;
    
    const comparables = await comparablesService.findComparables(req.params.id, {
      maxDistance: Number(maxDistance),
      maxResults: Number(maxResults),
      minSimilarityScore: Number(minSimilarityScore)
    });

    res.json(comparables);
  } catch (error) {
    logger.error('Comparables search error:', error);
    res.status(500).json({ error: 'Failed to find comparables' });
  }
});

/**
 * POST /api/properties/:id/scenarios
 * Create financial scenarios for property analysis
 */
router.post('/:id/scenarios', async (req, res) => {
  try {
    const { scenarios } = req.body;
    
    if (!Array.isArray(scenarios)) {
      return res.status(400).json({ error: 'Scenarios must be an array' });
    }

    const property = await prisma.property.findUnique({
      where: { id: req.params.id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const createdScenarios = [];

    for (const scenario of scenarios) {
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

      createdScenarios.push(savedScenario);
    }

    res.json(createdScenarios);
  } catch (error) {
    logger.error('Scenario creation error:', error);
    res.status(500).json({ error: 'Failed to create scenarios' });
  }
});

/**
 * PUT /api/properties/:id
 * Update property information
 */
router.put('/:id', async (req, res) => {
  try {
    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        tax_assessments: true,
        underwriting_analysis: true
      }
    });

    res.json(updatedProperty);
  } catch (error) {
    logger.error('Property update error:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

export default router;