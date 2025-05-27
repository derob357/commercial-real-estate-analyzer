import { prisma } from '../database'

export interface TaxAssessorConfig {
  county: string
  state: string
  assessorName: string
  assessorUrl: string
  searchUrlPattern?: string
  searchMethod: 'address' | 'parcel_id' | 'owner_name'
  requiresJavascript: boolean
  requiresAuthentication: boolean
  rateLimitMs: number
  selectors: {
    [key: string]: string
  }
  notes?: string
}

// Major US Tax Assessor Configurations
export const TAX_ASSESSOR_CONFIGS: TaxAssessorConfig[] = [
  // New York City
  {
    county: 'New York',
    state: 'NY',
    assessorName: 'NYC Department of Finance',
    assessorUrl: 'https://a836-acris.nyc.gov/bblsearch/bblsearch.asp',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 3000,
    selectors: {
      assessedValue: '.assessed-value',
      taxAmount: '.tax-amount',
      propertyClass: '.property-class'
    }
  },
  
  // Los Angeles County
  {
    county: 'Los Angeles',
    state: 'CA',
    assessorName: 'Los Angeles County Assessor',
    assessorUrl: 'https://portal.assessor.lacounty.gov/',
    searchUrlPattern: 'https://portal.assessor.lacounty.gov/parceldetail/{parcel_id}',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2000,
    selectors: {
      assessedValue: '[data-testid="assessed-value"]',
      landValue: '[data-testid="land-value"]',
      improvementValue: '[data-testid="improvement-value"]',
      taxAmount: '[data-testid="tax-amount"]'
    }
  },
  
  // Cook County (Chicago)
  {
    county: 'Cook',
    state: 'IL',
    assessorName: 'Cook County Assessor',
    assessorUrl: 'https://www.cookcountyassessor.com/',
    searchUrlPattern: 'https://www.cookcountyassessor.com/property-search',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2500,
    selectors: {
      assessedValue: '.assessed-value',
      marketValue: '.market-value',
      pin: '.property-pin'
    }
  },
  
  // Harris County (Houston)
  {
    county: 'Harris',
    state: 'TX',
    assessorName: 'Harris County Appraisal District',
    assessorUrl: 'https://hcad.org/',
    searchUrlPattern: 'https://hcad.org/property-search/',
    searchMethod: 'address',
    requiresJavascript: false,
    requiresAuthentication: false,
    rateLimitMs: 1500,
    selectors: {
      totalValue: '.total-value',
      landValue: '.land-value',
      improvementValue: '.improvement-value',
      exemptions: '.exemptions'
    }
  },
  
  // Maricopa County (Phoenix)
  {
    county: 'Maricopa',
    state: 'AZ',
    assessorName: 'Maricopa County Assessor',
    assessorUrl: 'https://mcassessor.maricopa.gov/',
    searchUrlPattern: 'https://mcassessor.maricopa.gov/property-search',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2000,
    selectors: {
      fullCashValue: '.full-cash-value',
      assessedValue: '.assessed-value',
      parcelNumber: '.parcel-number'
    }
  },
  
  // Philadelphia County
  {
    county: 'Philadelphia',
    state: 'PA',
    assessorName: 'Philadelphia Office of Property Assessment',
    assessorUrl: 'https://property.phila.gov/',
    searchUrlPattern: 'https://property.phila.gov/search',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2000,
    selectors: {
      marketValue: '.market-value',
      assessedValue: '.assessed-value',
      opa: '.opa-number'
    }
  },
  
  // Bexar County (San Antonio)
  {
    county: 'Bexar',
    state: 'TX',
    assessorName: 'Bexar County Appraisal District',
    assessorUrl: 'https://www.bcad.org/',
    searchUrlPattern: 'https://www.bcad.org/property-search',
    searchMethod: 'address',
    requiresJavascript: false,
    requiresAuthentication: false,
    rateLimitMs: 1500,
    selectors: {
      marketValue: '.market-value',
      taxableValue: '.taxable-value',
      landValue: '.land-value'
    }
  },
  
  // San Diego County
  {
    county: 'San Diego',
    state: 'CA',
    assessorName: 'San Diego County Assessor',
    assessorUrl: 'https://sdtreastax.com/',
    searchUrlPattern: 'https://sdtreastax.com/PropertyTaxPortal/PropertySearch',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2500,
    selectors: {
      assessedValue: '.assessed-value',
      landValue: '.land-value',
      structureValue: '.structure-value'
    }
  },
  
  // Dallas County
  {
    county: 'Dallas',
    state: 'TX',
    assessorName: 'Dallas Central Appraisal District',
    assessorUrl: 'https://www.dallascad.org/',
    searchUrlPattern: 'https://www.dallascad.org/property-search',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2000,
    selectors: {
      marketValue: '.market-value',
      assessedValue: '.assessed-value',
      account: '.account-number'
    }
  },
  
  // Santa Clara County (San Jose)
  {
    county: 'Santa Clara',
    state: 'CA',
    assessorName: 'Santa Clara County Assessor',
    assessorUrl: 'https://www.sccassessor.org/',
    searchUrlPattern: 'https://www.sccassessor.org/property-search',
    searchMethod: 'address',
    requiresJavascript: true,
    requiresAuthentication: false,
    rateLimitMs: 2500,
    selectors: {
      assessedValue: '.assessed-value',
      landValue: '.land-value',
      improvementValue: '.improvement-value'
    }
  }
]

// ZIP code to county mapping for major metropolitan areas
export const ZIP_TO_COUNTY_MAPPING: { [zipCode: string]: { county: string; state: string } } = {
  // New York City
  '10001': { county: 'New York', state: 'NY' },
  '10002': { county: 'New York', state: 'NY' },
  '10003': { county: 'New York', state: 'NY' },
  '10004': { county: 'New York', state: 'NY' },
  '10005': { county: 'New York', state: 'NY' },
  '11201': { county: 'Kings', state: 'NY' },
  '11202': { county: 'Kings', state: 'NY' },
  '11203': { county: 'Kings', state: 'NY' },
  '10451': { county: 'Bronx', state: 'NY' },
  '10452': { county: 'Bronx', state: 'NY' },
  '11101': { county: 'Queens', state: 'NY' },
  '11102': { county: 'Queens', state: 'NY' },
  
  // Los Angeles
  '90001': { county: 'Los Angeles', state: 'CA' },
  '90002': { county: 'Los Angeles', state: 'CA' },
  '90210': { county: 'Los Angeles', state: 'CA' },
  '90211': { county: 'Los Angeles', state: 'CA' },
  '90212': { county: 'Los Angeles', state: 'CA' },
  
  // Chicago
  '60601': { county: 'Cook', state: 'IL' },
  '60602': { county: 'Cook', state: 'IL' },
  '60603': { county: 'Cook', state: 'IL' },
  '60604': { county: 'Cook', state: 'IL' },
  '60605': { county: 'Cook', state: 'IL' },
  
  // Houston
  '77001': { county: 'Harris', state: 'TX' },
  '77002': { county: 'Harris', state: 'TX' },
  '77003': { county: 'Harris', state: 'TX' },
  '77004': { county: 'Harris', state: 'TX' },
  '77005': { county: 'Harris', state: 'TX' },
  
  // Phoenix
  '85001': { county: 'Maricopa', state: 'AZ' },
  '85002': { county: 'Maricopa', state: 'AZ' },
  '85003': { county: 'Maricopa', state: 'AZ' },
  '85004': { county: 'Maricopa', state: 'AZ' },
  '85005': { county: 'Maricopa', state: 'AZ' },
  
  // Philadelphia
  '19101': { county: 'Philadelphia', state: 'PA' },
  '19102': { county: 'Philadelphia', state: 'PA' },
  '19103': { county: 'Philadelphia', state: 'PA' },
  '19104': { county: 'Philadelphia', state: 'PA' },
  '19105': { county: 'Philadelphia', state: 'PA' },
  
  // San Antonio
  '78201': { county: 'Bexar', state: 'TX' },
  '78202': { county: 'Bexar', state: 'TX' },
  '78203': { county: 'Bexar', state: 'TX' },
  '78204': { county: 'Bexar', state: 'TX' },
  '78205': { county: 'Bexar', state: 'TX' },
  
  // San Diego
  '92101': { county: 'San Diego', state: 'CA' },
  '92102': { county: 'San Diego', state: 'CA' },
  '92103': { county: 'San Diego', state: 'CA' },
  '92104': { county: 'San Diego', state: 'CA' },
  '92105': { county: 'San Diego', state: 'CA' },
  
  // Dallas
  '75201': { county: 'Dallas', state: 'TX' },
  '75202': { county: 'Dallas', state: 'TX' },
  '75203': { county: 'Dallas', state: 'TX' },
  '75204': { county: 'Dallas', state: 'TX' },
  '75205': { county: 'Dallas', state: 'TX' },
  
  // San Jose
  '95101': { county: 'Santa Clara', state: 'CA' },
  '95102': { county: 'Santa Clara', state: 'CA' },
  '95103': { county: 'Santa Clara', state: 'CA' },
  '95104': { county: 'Santa Clara', state: 'CA' },
  '95105': { county: 'Santa Clara', state: 'CA' }
}

export class TaxAssessorMapper {
  
  static async initializeDatabase() {
    console.log('Initializing tax assessor database...')
    
    // Insert tax assessor sources
    for (const config of TAX_ASSESSOR_CONFIGS) {
      await prisma.taxAssessorSource.upsert({
        where: {
          county: config.county,
          state: config.state
        },
        update: {
          assessor_name: config.assessorName,
          assessor_url: config.assessorUrl,
          search_url_pattern: config.searchUrlPattern,
          search_method: config.searchMethod,
          requires_javascript: config.requiresJavascript,
          requires_authentication: config.requiresAuthentication,
          rate_limit_ms: config.rateLimitMs,
          selectors: JSON.stringify(config.selectors),
          notes: config.notes,
          updated_at: new Date()
        },
        create: {
          county: config.county,
          state: config.state,
          assessor_name: config.assessorName,
          assessor_url: config.assessorUrl,
          search_url_pattern: config.searchUrlPattern,
          search_method: config.searchMethod,
          requires_javascript: config.requiresJavascript,
          requires_authentication: config.requiresAuthentication,
          rate_limit_ms: config.rateLimitMs,
          selectors: JSON.stringify(config.selectors),
          notes: config.notes
        }
      })
    }
    
    // Insert ZIP code mappings
    for (const [zipCode, location] of Object.entries(ZIP_TO_COUNTY_MAPPING)) {
      await prisma.zipCodeMapping.upsert({
        where: { zip_code: zipCode },
        update: {
          city: '', // Will be populated later with geocoding
          county: location.county,
          state: location.state,
          updated_at: new Date()
        },
        create: {
          zip_code: zipCode,
          city: '', // Will be populated later with geocoding
          county: location.county,
          state: location.state
        }
      })
    }
    
    console.log('Tax assessor database initialization complete')
  }
  
  static async getAssessorForZipCode(zipCode: string) {
    // First check our ZIP code mapping
    const mapping = await prisma.zipCodeMapping.findUnique({
      where: { zip_code: zipCode }
    })
    
    if (mapping) {
      return await prisma.taxAssessorSource.findFirst({
        where: {
          county: mapping.county,
          state: mapping.state
        }
      })
    }
    
    // If not found, try to determine county from external API or fallback
    return null
  }
  
  static async getAssessorForCounty(county: string, state: string) {
    return await prisma.taxAssessorSource.findFirst({
      where: {
        county: county,
        state: state
      }
    })
  }
  
  static async getAllActiveAssessors() {
    return await prisma.taxAssessorSource.findMany({
      where: { is_active: true },
      orderBy: [
        { state: 'asc' },
        { county: 'asc' }
      ]
    })
  }
  
  static async updateAssessorStats(
    county: string, 
    state: string, 
    success: boolean, 
    errorMessage?: string
  ) {
    const updateData: any = {
      updated_at: new Date()
    }
    
    if (success) {
      updateData.last_successful_scrape = new Date()
      updateData.success_count = { increment: 1 }
    } else {
      updateData.last_failed_scrape = new Date()
      updateData.failure_count = { increment: 1 }
    }
    
    await prisma.taxAssessorSource.updateMany({
      where: {
        county: county,
        state: state
      },
      data: updateData
    })
  }
}