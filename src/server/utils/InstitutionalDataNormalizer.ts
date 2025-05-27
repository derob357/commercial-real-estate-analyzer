import { PrismaClient } from '@prisma/client';
import { logger } from '../index';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export interface NormalizationResult<T> {
  data: T;
  validation: ValidationResult;
  metadata: {
    originalSource: string;
    normalizedAt: string;
    transformationsApplied: string[];
  };
}

export class InstitutionalDataNormalizer {
  private prisma: PrismaClient;
  
  // Property type mappings for standardization
  private readonly propertyTypeMapping = new Map([
    // Multifamily variations
    ['apartment', 'multifamily'],
    ['apartments', 'multifamily'],
    ['multifamily residential', 'multifamily'],
    ['residential', 'multifamily'],
    ['garden style', 'multifamily'],
    ['high rise', 'multifamily'],
    ['mid rise', 'multifamily'],
    ['low rise', 'multifamily'],
    
    // Office variations
    ['office building', 'office'],
    ['office space', 'office'],
    ['commercial office', 'office'],
    ['professional office', 'office'],
    ['medical office', 'office'],
    ['flex office', 'office'],
    
    // Retail variations
    ['retail space', 'retail'],
    ['shopping center', 'retail'],
    ['strip center', 'retail'],
    ['mall', 'retail'],
    ['restaurant', 'retail'],
    ['storefront', 'retail'],
    
    // Industrial variations
    ['warehouse', 'industrial'],
    ['distribution', 'industrial'],
    ['manufacturing', 'industrial'],
    ['flex industrial', 'industrial'],
    ['logistics', 'industrial'],
    
    // Hotel variations
    ['hotel', 'hospitality'],
    ['motel', 'hospitality'],
    ['resort', 'hospitality'],
    ['hospitality', 'hospitality']
  ]);

  // State abbreviation mappings
  private readonly stateMapping = new Map([
    ['california', 'CA'], ['ca', 'CA'],
    ['texas', 'TX'], ['tx', 'TX'],
    ['florida', 'FL'], ['fl', 'FL'],
    ['new york', 'NY'], ['ny', 'NY'],
    ['illinois', 'IL'], ['il', 'IL'],
    ['pennsylvania', 'PA'], ['pa', 'PA'],
    ['ohio', 'OH'], ['oh', 'OH'],
    ['georgia', 'GA'], ['ga', 'GA'],
    ['north carolina', 'NC'], ['nc', 'NC'],
    ['michigan', 'MI'], ['mi', 'MI'],
    // Add more as needed
  ]);

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Normalize institutional property data
   */
  async normalizeProperty(rawProperty: any, source: string): Promise<NormalizationResult<any>> {
    const transformations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Start with a copy of the raw data
      const normalized = { ...rawProperty };

      // Normalize address
      if (normalized.address) {
        normalized.address = this.normalizeAddress(normalized.address);
        transformations.push('address_normalization');
      } else {
        errors.push('Missing required field: address');
      }

      // Normalize city and state
      if (normalized.city) {
        normalized.city = this.normalizeCity(normalized.city);
        transformations.push('city_normalization');
      }

      if (normalized.state) {
        normalized.state = this.normalizeState(normalized.state);
        transformations.push('state_normalization');
      }

      // Normalize zip code
      if (normalized.zipCode) {
        normalized.zip_code = this.normalizeZipCode(normalized.zipCode);
        delete normalized.zipCode;
        transformations.push('zip_code_normalization');
      }

      // Normalize property type
      if (normalized.propertyType) {
        const originalType = normalized.propertyType;
        normalized.property_type = this.normalizePropertyType(normalized.propertyType);
        normalized.property_subtype = originalType; // Keep original as subtype
        delete normalized.propertyType;
        transformations.push('property_type_normalization');
      }

      // Normalize financial data
      if (normalized.listingPrice) {
        const result = this.normalizePrice(normalized.listingPrice);
        if (result.isValid) {
          normalized.listing_price = result.value;
          transformations.push('price_normalization');
        } else {
          warnings.push(`Invalid listing price: ${normalized.listingPrice}`);
        }
        delete normalized.listingPrice;
      }

      if (normalized.capRate) {
        const result = this.normalizeCapRate(normalized.capRate);
        if (result.isValid) {
          normalized.cap_rate = result.value;
          transformations.push('cap_rate_normalization');
        } else {
          warnings.push(`Invalid cap rate: ${normalized.capRate}`);
        }
        delete normalized.capRate;
      }

      // Normalize units and square footage
      if (normalized.units) {
        const result = this.normalizeNumeric(normalized.units);
        if (result.isValid) {
          normalized.units = result.value;
          transformations.push('units_normalization');
        }
      }

      if (normalized.sqft || normalized.square_feet) {
        const sqftValue = normalized.sqft || normalized.square_feet;
        const result = this.normalizeNumeric(sqftValue);
        if (result.isValid) {
          normalized.sq_ft = result.value;
          transformations.push('sqft_normalization');
        }
        delete normalized.sqft;
        delete normalized.square_feet;
      }

      // Calculate price per unit and price per sqft
      if (normalized.listing_price) {
        if (normalized.units && normalized.units > 0) {
          normalized.price_per_unit = normalized.listing_price / normalized.units;
          transformations.push('price_per_unit_calculation');
        }
        if (normalized.sq_ft && normalized.sq_ft > 0) {
          normalized.price_per_sqft = normalized.listing_price / normalized.sq_ft;
          transformations.push('price_per_sqft_calculation');
        }
      }

      // Normalize year built
      if (normalized.yearBuilt) {
        const result = this.normalizeYearBuilt(normalized.yearBuilt);
        if (result.isValid) {
          normalized.year_built = result.value;
          transformations.push('year_built_normalization');
        }
        delete normalized.yearBuilt;
      }

      // Add source and metadata
      normalized.source = source;
      normalized.data_confidence = this.calculatePropertyConfidence(normalized, errors, warnings);
      normalized.last_verified = new Date();

      // Validation
      const validation = this.validateProperty(normalized);

      return {
        data: normalized,
        validation,
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };

    } catch (error) {
      logger.error('Error normalizing property data:', error);
      errors.push(`Normalization error: ${error}`);
      
      return {
        data: rawProperty,
        validation: {
          isValid: false,
          errors,
          warnings,
          confidence: 0
        },
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };
    }
  }

  /**
   * Normalize market research report data
   */
  async normalizeResearchReport(rawReport: any, source: string): Promise<NormalizationResult<any>> {
    const transformations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const normalized = { ...rawReport };

      // Normalize title
      if (normalized.title) {
        normalized.title = normalized.title.trim();
        transformations.push('title_normalization');
      } else {
        errors.push('Missing required field: title');
      }

      // Normalize publication date
      if (normalized.publicationDate) {
        const result = this.normalizeDate(normalized.publicationDate);
        if (result.isValid) {
          normalized.publication_date = result.value;
          transformations.push('date_normalization');
        } else {
          warnings.push(`Invalid publication date: ${normalized.publicationDate}`);
        }
        delete normalized.publicationDate;
      }

      // Normalize report type
      if (normalized.reportType) {
        normalized.report_type = this.normalizeReportType(normalized.reportType);
        transformations.push('report_type_normalization');
        delete normalized.reportType;
      }

      // Normalize market area
      if (normalized.marketArea) {
        normalized.market_area = this.normalizeMarketArea(normalized.marketArea);
        transformations.push('market_area_normalization');
        delete normalized.marketArea;
      }

      // Extract key findings if they're in text format
      if (normalized.summary && !normalized.key_findings) {
        normalized.key_findings = JSON.stringify(this.extractKeyFindings(normalized.summary));
        transformations.push('key_findings_extraction');
      }

      // Add metadata
      normalized.source = source;
      normalized.extraction_confidence = this.calculateResearchConfidence(normalized, errors, warnings);

      const validation = this.validateResearchReport(normalized);

      return {
        data: normalized,
        validation,
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };

    } catch (error) {
      logger.error('Error normalizing research report:', error);
      errors.push(`Normalization error: ${error}`);
      
      return {
        data: rawReport,
        validation: {
          isValid: false,
          errors,
          warnings,
          confidence: 0
        },
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };
    }
  }

  /**
   * Normalize transaction data
   */
  async normalizeTransaction(rawTransaction: any, source: string): Promise<NormalizationResult<any>> {
    const transformations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const normalized = { ...rawTransaction };

      // Normalize address fields
      if (normalized.propertyAddress) {
        normalized.property_address = this.normalizeAddress(normalized.propertyAddress);
        transformations.push('address_normalization');
        delete normalized.propertyAddress;
      }

      // Normalize sale price
      if (normalized.salePrice) {
        const result = this.normalizePrice(normalized.salePrice);
        if (result.isValid) {
          normalized.sale_price = result.value;
          transformations.push('sale_price_normalization');
        } else {
          errors.push(`Invalid sale price: ${normalized.salePrice}`);
        }
        delete normalized.salePrice;
      }

      // Normalize sale date
      if (normalized.saleDate) {
        const result = this.normalizeDate(normalized.saleDate);
        if (result.isValid) {
          normalized.sale_date = result.value;
          transformations.push('sale_date_normalization');
        } else {
          warnings.push(`Invalid sale date: ${normalized.saleDate}`);
        }
        delete normalized.saleDate;
      }

      // Normalize property type
      if (normalized.propertyType) {
        normalized.property_type = this.normalizePropertyType(normalized.propertyType);
        transformations.push('property_type_normalization');
        delete normalized.propertyType;
      }

      // Calculate price metrics
      if (normalized.sale_price) {
        if (normalized.units && normalized.units > 0) {
          normalized.price_per_unit = normalized.sale_price / normalized.units;
          transformations.push('price_per_unit_calculation');
        }
        if (normalized.sq_ft && normalized.sq_ft > 0) {
          normalized.price_per_sqft = normalized.sale_price / normalized.sq_ft;
          transformations.push('price_per_sqft_calculation');
        }
      }

      // Add metadata
      normalized.source = source;
      normalized.data_confidence = this.calculateTransactionConfidence(normalized, errors, warnings);

      const validation = this.validateTransaction(normalized);

      return {
        data: normalized,
        validation,
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };

    } catch (error) {
      logger.error('Error normalizing transaction data:', error);
      errors.push(`Normalization error: ${error}`);
      
      return {
        data: rawTransaction,
        validation: {
          isValid: false,
          errors,
          warnings,
          confidence: 0
        },
        metadata: {
          originalSource: source,
          normalizedAt: new Date().toISOString(),
          transformationsApplied: transformations
        }
      };
    }
  }

  // Normalization helper methods
  private normalizeAddress(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st)\b/gi, 'St')
      .replace(/\b(avenue|ave)\b/gi, 'Ave')
      .replace(/\b(boulevard|blvd)\b/gi, 'Blvd')
      .replace(/\b(drive|dr)\b/gi, 'Dr')
      .replace(/\b(road|rd)\b/gi, 'Rd')
      .replace(/\b(lane|ln)\b/gi, 'Ln')
      .replace(/\b(court|ct)\b/gi, 'Ct');
  }

  private normalizeCity(city: string): string {
    return city
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private normalizeState(state: string): string {
    const normalized = state.toLowerCase().trim();
    return this.stateMapping.get(normalized) || state.toUpperCase();
  }

  private normalizeZipCode(zipCode: string): string {
    const cleaned = zipCode.replace(/\D/g, '');
    return cleaned.length >= 5 ? cleaned.substring(0, 5) : cleaned;
  }

  private normalizePropertyType(propertyType: string): string {
    const normalized = propertyType.toLowerCase().trim();
    return this.propertyTypeMapping.get(normalized) || normalized;
  }

  private normalizePrice(price: any): { isValid: boolean; value?: number } {
    if (typeof price === 'number') {
      return { isValid: price > 0, value: price };
    }
    
    if (typeof price === 'string') {
      const cleaned = price.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      
      if (!isNaN(parsed) && parsed > 0) {
        // Handle different formats (millions, thousands, etc.)
        if (price.toLowerCase().includes('million') || price.includes('M')) {
          return { isValid: true, value: parsed * 1000000 };
        }
        if (price.toLowerCase().includes('thousand') || price.includes('K')) {
          return { isValid: true, value: parsed * 1000 };
        }
        return { isValid: true, value: parsed };
      }
    }
    
    return { isValid: false };
  }

  private normalizeCapRate(capRate: any): { isValid: boolean; value?: number } {
    if (typeof capRate === 'number') {
      // Convert to decimal if it looks like a percentage
      const value = capRate > 1 ? capRate / 100 : capRate;
      return { isValid: value > 0 && value < 1, value };
    }
    
    if (typeof capRate === 'string') {
      const cleaned = capRate.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      
      if (!isNaN(parsed) && parsed > 0) {
        const value = parsed > 1 ? parsed / 100 : parsed;
        return { isValid: value > 0 && value < 1, value };
      }
    }
    
    return { isValid: false };
  }

  private normalizeNumeric(value: any): { isValid: boolean; value?: number } {
    if (typeof value === 'number') {
      return { isValid: value >= 0, value };
    }
    
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9]/g, '');
      const parsed = parseInt(cleaned);
      
      if (!isNaN(parsed) && parsed >= 0) {
        return { isValid: true, value: parsed };
      }
    }
    
    return { isValid: false };
  }

  private normalizeYearBuilt(year: any): { isValid: boolean; value?: number } {
    const parsed = parseInt(year.toString());
    const currentYear = new Date().getFullYear();
    
    if (!isNaN(parsed) && parsed >= 1800 && parsed <= currentYear) {
      return { isValid: true, value: parsed };
    }
    
    return { isValid: false };
  }

  private normalizeDate(date: any): { isValid: boolean; value?: Date } {
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return { isValid: true, value: parsed };
      }
    } catch (error) {
      // Invalid date
    }
    
    return { isValid: false };
  }

  private normalizeReportType(reportType: string): string {
    const normalized = reportType.toLowerCase().trim();
    
    const typeMapping = new Map([
      ['market outlook', 'market_outlook'],
      ['market report', 'market_report'],
      ['investment trends', 'investment_trends'],
      ['cap rate survey', 'cap_rate_survey'],
      ['transaction report', 'transaction_report'],
      ['research report', 'research_report']
    ]);

    return typeMapping.get(normalized) || normalized.replace(/\s+/g, '_');
  }

  private normalizeMarketArea(marketArea: string): string {
    return marketArea
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractKeyFindings(summary: string): string[] {
    // Simple extraction logic - could be enhanced with NLP
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences
      .filter(sentence => 
        sentence.toLowerCase().includes('cap rate') ||
        sentence.toLowerCase().includes('price') ||
        sentence.toLowerCase().includes('market') ||
        sentence.toLowerCase().includes('growth') ||
        sentence.toLowerCase().includes('trend')
      )
      .map(s => s.trim())
      .slice(0, 5); // Limit to top 5 findings
  }

  // Confidence calculation methods
  private calculatePropertyConfidence(property: any, errors: string[], warnings: string[]): number {
    let score = 1.0;
    
    // Deduct for errors and warnings
    score -= errors.length * 0.2;
    score -= warnings.length * 0.1;
    
    // Required fields
    if (!property.address) score -= 0.3;
    if (!property.city || !property.state) score -= 0.2;
    if (!property.property_type) score -= 0.1;
    
    // Valuable fields
    if (property.listing_price) score += 0.1;
    if (property.cap_rate) score += 0.1;
    if (property.units || property.sq_ft) score += 0.05;
    if (property.year_built) score += 0.05;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateResearchConfidence(report: any, errors: string[], warnings: string[]): number {
    let score = 1.0;
    
    score -= errors.length * 0.25;
    score -= warnings.length * 0.1;
    
    if (!report.title) score -= 0.3;
    if (!report.publication_date) score -= 0.2;
    if (report.summary) score += 0.1;
    if (report.download_url || report.source_url) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateTransactionConfidence(transaction: any, errors: string[], warnings: string[]): number {
    let score = 1.0;
    
    score -= errors.length * 0.2;
    score -= warnings.length * 0.1;
    
    if (!transaction.property_address) score -= 0.3;
    if (!transaction.sale_price) score -= 0.3;
    if (!transaction.sale_date) score -= 0.2;
    if (transaction.cap_rate) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  // Validation methods
  private validateProperty(property: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!property.address) errors.push('Address is required');
    if (!property.city) errors.push('City is required');
    if (!property.state) errors.push('State is required');
    
    // Data quality validation
    if (property.listing_price && property.listing_price < 10000) {
      warnings.push('Listing price seems unusually low');
    }
    if (property.cap_rate && (property.cap_rate < 0.01 || property.cap_rate > 0.5)) {
      warnings.push('Cap rate outside typical range (1%-50%)');
    }
    if (property.year_built && property.year_built < 1900) {
      warnings.push('Year built seems unusually old');
    }

    const confidence = this.calculatePropertyConfidence(property, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  private validateResearchReport(report: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!report.title) errors.push('Title is required');
    if (!report.publication_date) errors.push('Publication date is required');
    
    if (report.title && report.title.length < 10) {
      warnings.push('Title seems unusually short');
    }

    const confidence = this.calculateResearchConfidence(report, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  private validateTransaction(transaction: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!transaction.property_address) errors.push('Property address is required');
    if (!transaction.sale_price) errors.push('Sale price is required');
    if (!transaction.sale_date) errors.push('Sale date is required');
    
    if (transaction.sale_price && transaction.sale_price < 50000) {
      warnings.push('Sale price seems unusually low for commercial property');
    }

    const confidence = this.calculateTransactionConfidence(transaction, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  /**
   * Generate data quality report
   */
  async generateQualityReport(source: string, dataType: string, records: any[]): Promise<any> {
    try {
      const report = {
        source,
        data_type: dataType,
        total_records: records.length,
        valid_records: 0,
        invalid_records: 0,
        duplicate_records: 0,
        missing_required_fields: 0,
        completeness_score: 0,
        report_date: new Date(),
        report_period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        report_period_end: new Date()
      };

      // Calculate quality metrics
      const addressSet = new Set();
      let duplicates = 0;
      let validCount = 0;
      let missingFields = 0;

      records.forEach(record => {
        // Check for duplicates (simple address-based check)
        const key = `${record.address}-${record.city}-${record.state}`;
        if (addressSet.has(key)) {
          duplicates++;
        } else {
          addressSet.add(key);
        }

        // Check validity
        if (record.data_confidence && record.data_confidence > 0.5) {
          validCount++;
        }

        // Check for missing required fields
        const requiredFields = ['address', 'city', 'state'];
        const missing = requiredFields.filter(field => !record[field]);
        if (missing.length > 0) {
          missingFields++;
        }
      });

      report.valid_records = validCount;
      report.invalid_records = records.length - validCount;
      report.duplicate_records = duplicates;
      report.missing_required_fields = missingFields;
      report.completeness_score = records.length > 0 ? (validCount / records.length) * 100 : 0;

      // Save to database
      await this.prisma.dataQualityReport.create({
        data: report
      });

      return report;

    } catch (error) {
      logger.error('Error generating data quality report:', error);
      throw error;
    }
  }
}