import { logger } from '../index';

export class DataNormalizer {
  
  /**
   * Normalize RealtyRates.com data
   */
  normalizeRealtyRatesData(rawData: any): any {
    try {
      const normalized: any = {
        capRates: {},
        marketData: [],
        mortgageTerms: []
      };

      // Normalize cap rates
      if (rawData.capRates) {
        for (const [propertyType, rate] of Object.entries(rawData.capRates)) {
          const normalizedType = this.normalizePropertyType(propertyType);
          normalized.capRates[normalizedType] = this.normalizePercentage(rate as string | number);
        }
      }

      // Normalize interest rates
      if (rawData.interestRates) {
        for (const [loanType, rate] of Object.entries(rawData.interestRates)) {
          normalized.mortgageTerms.push({
            loanType: this.normalizeLoanType(loanType),
            interestRate: this.normalizePercentage(rate as string | number),
            source: 'realtyrates'
          });
        }
      }

      return normalized;
    } catch (error) {
      logger.error('RealtyRates data normalization failed:', error);
      return {};
    }
  }

  /**
   * Normalize Marcus & Millichap listings
   */
  normalizeMarcusMillichapListings(rawListings: any[]): any[] {
    try {
      return rawListings.map(listing => ({
        address: this.normalizeAddress(listing.address),
        city: this.normalizeCity(listing.city),
        state: this.normalizeState(listing.state),
        zipCode: this.normalizeZipCode(listing.zipCode),
        listingPrice: this.normalizePrice(listing.listingPrice),
        units: this.normalizeUnits(listing.units),
        sqft: this.normalizeSquareFeet(listing.sqft),
        yearBuilt: this.normalizeYear(listing.yearBuilt),
        propertyType: this.normalizePropertyType(listing.propertyType),
        capRate: this.normalizePercentage(listing.capRate),
        description: this.normalizeDescription(listing.description),
        listingSource: 'marcus_millichap',
        scrapedAt: new Date()
      })).filter(listing => listing.address || listing.listingPrice);
    } catch (error) {
      logger.error('Marcus & Millichap listing normalization failed:', error);
      return [];
    }
  }

  /**
   * Normalize research reports
   */
  normalizeResearchReports(rawReports: any[], source: string): any[] {
    try {
      return rawReports.map(report => ({
        title: this.normalizeTitle(report.title),
        reportType: this.normalizeReportType(report.reportType || 'market_report'),
        summary: this.normalizeDescription(report.summary),
        publicationDate: this.normalizeDate(report.publicationDate),
        source,
        sourceUrl: this.normalizeUrl(report.sourceUrl),
        extractedData: null,
        scrapedAt: new Date()
      })).filter(report => report.title);
    } catch (error) {
      logger.error('Research report normalization failed:', error);
      return [];
    }
  }

  /**
   * Normalize economic indicators
   */
  normalizeEconomicIndicators(rawIndicators: any[], source: string): any[] {
    try {
      return rawIndicators.map(indicator => ({
        indicatorType: this.normalizeIndicatorType(indicator.name),
        indicatorName: indicator.name?.trim(),
        value: this.normalizeNumericValue(indicator.value),
        unit: this.normalizeUnit(indicator.unit),
        measurementDate: this.normalizeDate(indicator.date),
        metroArea: this.normalizeMetroArea(indicator.region),
        source,
        confidenceLevel: 'medium',
        scrapedAt: new Date()
      })).filter(indicator => indicator.indicatorName && indicator.value !== null);
    } catch (error) {
      logger.error('Economic indicator normalization failed:', error);
      return [];
    }
  }

  /**
   * Normalize tax assessment data
   */
  normalizeTaxAssessmentData(rawData: any, params: any): any | null {
    try {
      if (!rawData || Object.keys(rawData).length === 0) {
        return null;
      }

      return {
        assessmentYear: this.normalizeYear(rawData.assessmentYear) || new Date().getFullYear(),
        assessedValue: this.normalizePrice(rawData.assessedValue),
        landValue: this.normalizePrice(rawData.landValue),
        improvementValue: this.normalizePrice(rawData.improvementValue),
        annualTaxes: this.normalizePrice(rawData.taxAmount),
        assessmentDate: this.normalizeDate(rawData.assessmentDate) || new Date(),
        scrapedAt: new Date()
      };
    } catch (error) {
      logger.error('Tax assessment data normalization failed:', error);
      return null;
    }
  }

  // Helper normalization methods
  private normalizeAddress(address: string | undefined): string {
    if (!address) return '';
    return address.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private normalizeCity(city: string | undefined): string {
    if (!city) return '';
    return city.trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  private normalizeState(state: string | undefined): string {
    if (!state) return '';
    const cleaned = state.trim().toUpperCase();
    
    // Handle common state abbreviations
    const stateMap: { [key: string]: string } = {
      'CALIFORNIA': 'CA',
      'NEW YORK': 'NY',
      'TEXAS': 'TX',
      'FLORIDA': 'FL',
      // Add more as needed
    };
    
    return stateMap[cleaned] || cleaned;
  }

  private normalizeZipCode(zipCode: string | undefined): string {
    if (!zipCode) return '';
    const cleaned = zipCode.replace(/\D/g, '');
    return cleaned.length >= 5 ? cleaned.substring(0, 5) : cleaned;
  }

  private normalizePrice(price: string | number | undefined): number | null {
    if (price === undefined || price === null || price === '') return null;
    
    if (typeof price === 'number') return price;
    
    const cleaned = price.toString().replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeUnits(units: string | number | undefined): number | null {
    if (units === undefined || units === null || units === '') return null;
    
    if (typeof units === 'number') return units;
    
    const parsed = Number.parseInt(units.toString().replace(/\D/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeSquareFeet(sqft: string | number | undefined): number | null {
    if (sqft === undefined || sqft === null || sqft === '') return null;
    
    if (typeof sqft === 'number') return sqft;
    
    const cleaned = sqft.toString().replace(/[^\d]/g, '');
    const parsed = Number.parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeYear(year: string | number | undefined): number | null {
    if (year === undefined || year === null || year === '') return null;
    
    if (typeof year === 'number') return year;
    
    const parsed = Number.parseInt(year.toString().replace(/\D/g, ''));
    if (isNaN(parsed) || parsed < 1800 || parsed > new Date().getFullYear() + 10) {
      return null;
    }
    return parsed;
  }

  private normalizePropertyType(type: string | undefined): string {
    if (!type) return 'unknown';
    
    const cleaned = type.toLowerCase().trim();
    
    // Standardize property types
    const typeMap: { [key: string]: string } = {
      'multifamily': 'multifamily',
      'multi-family': 'multifamily',
      'apartment': 'multifamily',
      'apartments': 'multifamily',
      'office': 'office',
      'retail': 'retail',
      'industrial': 'industrial',
      'warehouse': 'industrial',
      'mixed use': 'mixed_use',
      'mixed-use': 'mixed_use',
      'hotel': 'hospitality',
      'hospitality': 'hospitality'
    };
    
    return typeMap[cleaned] || cleaned;
  }

  private normalizePercentage(rate: string | number | undefined): number | null {
    if (rate === undefined || rate === null || rate === '') return null;
    
    if (typeof rate === 'number') return rate;
    
    const cleaned = rate.toString().replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    
    if (isNaN(parsed)) return null;
    
    // If the value is greater than 1, assume it's already a percentage
    return parsed > 1 ? parsed / 100 : parsed;
  }

  private normalizeDescription(description: string | undefined): string | null {
    if (!description) return null;
    
    const cleaned = description.trim().replace(/\s+/g, ' ');
    return cleaned.length > 0 ? cleaned : null;
  }

  private normalizeTitle(title: string | undefined): string {
    if (!title) return '';
    return title.trim().replace(/\s+/g, ' ');
  }

  private normalizeReportType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'market report': 'market_report',
      'market_report': 'market_report',
      'forecast': 'forecast',
      'survey': 'survey',
      'transaction report': 'transaction_report',
      'transaction_report': 'transaction_report'
    };
    
    return typeMap[type.toLowerCase()] || 'market_report';
  }

  private normalizeDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    
    try {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  private normalizeUrl(url: string | undefined): string | null {
    if (!url) return null;
    
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      // Try to fix relative URLs
      if (url.startsWith('/')) {
        return url;
      }
      return null;
    }
  }

  private normalizeIndicatorType(name: string | undefined): string {
    if (!name) return 'unknown';
    
    const cleaned = name.toLowerCase().trim();
    
    const typeMap: { [key: string]: string } = {
      'gdp': 'gdp_growth',
      'gdp growth': 'gdp_growth',
      'employment': 'employment_rate',
      'employment rate': 'employment_rate',
      'unemployment': 'unemployment_rate',
      'population': 'population_growth',
      'population growth': 'population_growth',
      'median income': 'median_income',
      'household income': 'median_income',
      'cost of living': 'cost_of_living'
    };
    
    return typeMap[cleaned] || cleaned.replace(/\s+/g, '_');
  }

  private normalizeUnit(unit: string | undefined): string | null {
    if (!unit) return null;
    
    const cleaned = unit.toLowerCase().trim();
    
    const unitMap: { [key: string]: string } = {
      '%': 'percentage',
      'percent': 'percentage',
      'percentage': 'percentage',
      '$': 'dollars',
      'usd': 'dollars',
      'dollars': 'dollars',
      'people': 'count',
      'persons': 'count',
      'jobs': 'count'
    };
    
    return unitMap[cleaned] || cleaned;
  }

  private normalizeNumericValue(value: string | number | undefined): number | null {
    if (value === undefined || value === null || value === '') return null;
    
    if (typeof value === 'number') return value;
    
    const cleaned = value.toString().replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeMetroArea(area: string | undefined): string | null {
    if (!area) return null;
    
    return area.trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  private normalizeLoanType(type: string): string {
    const cleaned = type.toLowerCase().trim();
    
    const typeMap: { [key: string]: string } = {
      'conventional': 'conventional',
      'sba': 'sba',
      'bridge': 'bridge',
      'construction': 'construction',
      'permanent': 'permanent',
      'refinance': 'refinance'
    };
    
    return typeMap[cleaned] || cleaned;
  }
}