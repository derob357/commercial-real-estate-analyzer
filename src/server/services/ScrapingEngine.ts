import { chromium, type Browser, type Page } from 'playwright';
import cheerio from 'cheerio';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../index';
import { RateLimiter } from '../utils/RateLimiter';
import { DataNormalizer } from '../utils/DataNormalizer';

export interface ScrapingJob {
  id: string;
  type: 'realtyrates' | 'marcus_millichap' | 'milken_institute' | 'tax_assessor' | 'property_listings';
  url: string;
  params?: Record<string, any>;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

export interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    scrapedAt: string;
    processingTime: number;
    dataSource: string;
    recordCount: number;
  };
}

export class ScrapingEngine {
  private prisma: PrismaClient;
  private browser: Browser | null = null;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private dataNormalizer: DataNormalizer;

  constructor() {
    this.prisma = new PrismaClient();
    this.dataNormalizer = new DataNormalizer();
    this.initializeRateLimiters();
  }

  private initializeRateLimiters() {
    // Configure rate limiters for different sources
    this.rateLimiters.set('realtyrates', new RateLimiter(30, 60000)); // 30 requests per minute
    this.rateLimiters.set('marcus_millichap', new RateLimiter(20, 60000)); // 20 requests per minute
    this.rateLimiters.set('milken_institute', new RateLimiter(40, 60000)); // 40 requests per minute
    this.rateLimiters.set('tax_assessor', new RateLimiter(10, 60000)); // 10 requests per minute (conservative)
  }

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      logger.info('Scraping engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scraping engine:', error);
      throw error;
    }
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await this.prisma.$disconnect();
  }

  /**
   * Execute a scraping job
   */
  async executeJob(job: ScrapingJob): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting scraping job: ${job.type} - ${job.url}`);

      // Apply rate limiting
      const rateLimiter = this.rateLimiters.get(job.type);
      if (rateLimiter) {
        await rateLimiter.waitForToken();
      }

      let result: ScrapingResult;

      switch (job.type) {
        case 'realtyrates':
          result = await this.scrapeRealtyRates(job);
          break;
        case 'marcus_millichap':
          result = await this.scrapeMarcusMillichap(job);
          break;
        case 'milken_institute':
          result = await this.scrapeMilkenInstitute(job);
          break;
        case 'tax_assessor':
          result = await this.scrapeTaxAssessor(job);
          break;
        case 'property_listings':
          result = await this.scrapePropertyListings(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        // Update job status
        await this.prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completed_at: new Date(),
            results: JSON.stringify(result.data)
          }
        });

        logger.info(`Scraping job completed: ${job.type} in ${processingTime}ms`);
      }

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime,
          scrapedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Scraping job failed: ${job.type}`, error);
      
      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: { increment: 1 }
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scrape RealtyRates.com for cap rates and market data
   */
  private async scrapeRealtyRates(job: ScrapingJob): Promise<ScrapingResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // Set user agent to appear as regular browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(job.url, { waitUntil: 'networkidle' });

      // Extract cap rate data by property type and region
      const capRateData = await page.evaluate(() => {
        const data: any = {
          capRates: {},
          regions: [],
          propertyTypes: [],
          lastUpdated: null
        };

        // Look for cap rate tables or data sections
        const tables = document.querySelectorAll('table, .data-table, .cap-rate-table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const propertyType = cells[0]?.textContent?.trim();
              const capRate = cells[1]?.textContent?.trim();
              
              if (propertyType && capRate && /\d+\.\d+%?/.test(capRate)) {
                const rate = Number.parseFloat(capRate.replace('%', '')) / 100;
                data.capRates[propertyType.toLowerCase()] = rate;
              }
            }
          });
        });

        // Extract region data
        const regionSelectors = document.querySelectorAll('.region-selector option, .metro-area option');
        regionSelectors.forEach(option => {
          const region = option.textContent?.trim();
          if (region && region !== '') {
            data.regions.push(region);
          }
        });

        // Extract property types
        const propertyTypeElements = document.querySelectorAll('.property-type, .asset-class');
        propertyTypeElements.forEach(element => {
          const type = element.textContent?.trim();
          if (type && type !== '') {
            data.propertyTypes.push(type);
          }
        });

        // Look for last updated date
        const updateElements = document.querySelectorAll('.last-updated, .data-date, .updated');
        updateElements.forEach(element => {
          const dateText = element.textContent?.trim();
          if (dateText && /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(dateText)) {
            data.lastUpdated = dateText;
          }
        });

        return data;
      });

      // Extract mortgage terms and interest rates
      const mortgageData = await page.evaluate(() => {
        const data: any = {
          interestRates: {},
          terms: [],
          equityRequirements: {}
        };

        // Look for mortgage rate tables
        const rateTables = document.querySelectorAll('.mortgage-rates, .interest-rates, .financing-table');
        rateTables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const loanType = cells[0]?.textContent?.trim();
              const rate = cells[1]?.textContent?.trim();
              const term = cells[2]?.textContent?.trim();
              
              if (loanType && rate && /\d+\.\d+%?/.test(rate)) {
                data.interestRates[loanType] = Number.parseFloat(rate.replace('%', '')) / 100;
              }
              
              if (term && /\d+/.test(term)) {
                data.terms.push(Number.parseInt(term));
              }
            }
          });
        });

        return data;
      });

      // Normalize and save data
      const normalizedData = this.dataNormalizer.normalizeRealtyRatesData({
        ...capRateData,
        ...mortgageData
      });

      // Save to database
      await this.saveMarketData(normalizedData, 'realtyrates');

      return {
        success: true,
        data: normalizedData,
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTime: 0,
          dataSource: 'realtyrates',
          recordCount: Object.keys(normalizedData.capRates || {}).length
        }
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Scrape Marcus & Millichap for property listings and market research
   */
  private async scrapeMarcusMillichap(job: ScrapingJob): Promise<ScrapingResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(job.url, { waitUntil: 'networkidle' });

      // Extract property listings
      const listings = await page.evaluate(() => {
        const properties: any[] = [];
        
        const listingElements = document.querySelectorAll('.property-listing, .listing-item, .property-card');
        
        listingElements.forEach(element => {
          const property: any = {};
          
          // Extract basic info
          property.address = element.querySelector('.address, .property-address')?.textContent?.trim();
          property.city = element.querySelector('.city')?.textContent?.trim();
          property.state = element.querySelector('.state')?.textContent?.trim();
          property.zipCode = element.querySelector('.zip-code')?.textContent?.trim();
          
          // Extract financial info
          const priceElement = element.querySelector('.price, .listing-price, .asking-price');
          if (priceElement) {
            const priceText = priceElement.textContent?.trim();
            if (priceText) {
              property.listingPrice = Number.parseFloat(priceText.replace(/[^\d.]/g, ''));
            }
          }
          
          // Extract property details
          property.units = element.querySelector('.units')?.textContent?.match(/\d+/)?.[0];
          property.sqft = element.querySelector('.sqft, .square-feet')?.textContent?.match(/[\d,]+/)?.[0]?.replace(',', '');
          property.yearBuilt = element.querySelector('.year-built')?.textContent?.match(/\d{4}/)?.[0];
          property.propertyType = element.querySelector('.property-type, .asset-type')?.textContent?.trim();
          
          // Extract cap rate if available
          const capRateElement = element.querySelector('.cap-rate');
          if (capRateElement) {
            const capRateText = capRateElement.textContent?.trim();
            if (capRateText && /\d+\.\d+%?/.test(capRateText)) {
              property.capRate = Number.parseFloat(capRateText.replace('%', '')) / 100;
            }
          }
          
          // Extract description
          property.description = element.querySelector('.description, .property-description')?.textContent?.trim();
          
          if (property.address || property.listingPrice) {
            properties.push(property);
          }
        });
        
        return properties;
      });

      // Extract market research reports
      const reports = await page.evaluate(() => {
        const reportData: any[] = [];
        
        const reportElements = document.querySelectorAll('.research-report, .market-report, .report-item');
        
        reportElements.forEach(element => {
          const report: any = {};
          
          report.title = element.querySelector('.report-title, .title')?.textContent?.trim();
          report.summary = element.querySelector('.summary, .excerpt')?.textContent?.trim();
          report.publicationDate = element.querySelector('.date, .publication-date')?.textContent?.trim();
          report.reportType = element.querySelector('.report-type')?.textContent?.trim();
          
          const linkElement = element.querySelector('a[href]');
          if (linkElement) {
            report.sourceUrl = linkElement.getAttribute('href');
          }
          
          if (report.title) {
            reportData.push(report);
          }
        });
        
        return reportData;
      });

      // Normalize and save data
      const normalizedListings = this.dataNormalizer.normalizeMarcusMillichapListings(listings);
      const normalizedReports = this.dataNormalizer.normalizeResearchReports(reports, 'marcus_millichap');

      // Save listings to database
      for (const listing of normalizedListings) {
        await this.savePropertyListing(listing);
      }

      // Save reports to database
      for (const report of normalizedReports) {
        await this.saveResearchReport(report);
      }

      return {
        success: true,
        data: {
          listings: normalizedListings,
          reports: normalizedReports
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTime: 0,
          dataSource: 'marcus_millichap',
          recordCount: normalizedListings.length + normalizedReports.length
        }
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Scrape Milken Institute for economic indicators
   */
  private async scrapeMilkenInstitute(job: ScrapingJob): Promise<ScrapingResult> {
    try {
      // Use axios for simpler content extraction from Milken Institute
      const response = await axios.get(job.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const indicators: any[] = [];

      // Extract economic indicators from various sections
      $('.economic-indicator, .data-point, .metric').each((index, element) => {
        const indicator: any = {};
        
        indicator.name = $(element).find('.indicator-name, .metric-name').text().trim();
        indicator.value = $(element).find('.value, .metric-value').text().trim();
        indicator.unit = $(element).find('.unit').text().trim();
        indicator.date = $(element).find('.date, .measurement-date').text().trim();
        indicator.region = $(element).find('.region, .metro-area').text().trim();
        
        if (indicator.name && indicator.value) {
          indicators.push(indicator);
        }
      });

      // Extract ranking data
      const rankings: any[] = [];
      $('.ranking-item, .city-ranking').each((index, element) => {
        const ranking: any = {};
        
        ranking.rank = $(element).find('.rank').text().trim();
        ranking.city = $(element).find('.city-name').text().trim();
        ranking.score = $(element).find('.score').text().trim();
        ranking.category = $(element).find('.category').text().trim();
        
        if (ranking.city && ranking.rank) {
          rankings.push(ranking);
        }
      });

      // Normalize and save data
      const normalizedIndicators = this.dataNormalizer.normalizeEconomicIndicators(indicators, 'milken_institute');
      
      // Save to database
      for (const indicator of normalizedIndicators) {
        await this.saveEconomicIndicator(indicator);
      }

      return {
        success: true,
        data: {
          indicators: normalizedIndicators,
          rankings
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTime: 0,
          dataSource: 'milken_institute',
          recordCount: normalizedIndicators.length
        }
      };

    } catch (error) {
      throw new Error(`Milken Institute scraping failed: ${error}`);
    }
  }

  /**
   * Scrape tax assessor websites
   */
  private async scrapeTaxAssessor(job: ScrapingJob): Promise<ScrapingResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Get tax assessor configuration
      const assessorConfig = await this.getTaxAssessorConfig(job.params?.county, job.params?.state);
      
      if (!assessorConfig) {
        throw new Error('Tax assessor configuration not found');
      }

      await page.goto(job.url, { waitUntil: 'networkidle' });

      // Perform search based on assessor configuration
      if (job.params?.address) {
        await this.performTaxAssessorSearch(page, job.params.address, assessorConfig);
      }

      // Extract tax assessment data
      const taxData = await page.evaluate((selectors) => {
        const data: any = {};
        
        try {
          const selectorsObj = JSON.parse(selectors || '{}');
          
          // Extract assessed value
          const assessedValueElement = document.querySelector(selectorsObj.assessed_value || '.assessed-value');
          if (assessedValueElement) {
            data.assessedValue = assessedValueElement.textContent?.trim();
          }
          
          // Extract land value
          const landValueElement = document.querySelector(selectorsObj.land_value || '.land-value');
          if (landValueElement) {
            data.landValue = landValueElement.textContent?.trim();
          }
          
          // Extract improvement value
          const improvementValueElement = document.querySelector(selectorsObj.improvement_value || '.improvement-value');
          if (improvementValueElement) {
            data.improvementValue = improvementValueElement.textContent?.trim();
          }
          
          // Extract tax amount
          const taxAmountElement = document.querySelector(selectorsObj.tax_amount || '.tax-amount');
          if (taxAmountElement) {
            data.taxAmount = taxAmountElement.textContent?.trim();
          }
          
          // Extract assessment year
          const assessmentYearElement = document.querySelector(selectorsObj.assessment_year || '.assessment-year');
          if (assessmentYearElement) {
            data.assessmentYear = assessmentYearElement.textContent?.trim();
          }
          
        } catch (error) {
          console.error('Error extracting tax data:', error);
        }
        
        return data;
      }, assessorConfig.selectors);

      // Normalize and save data
      const normalizedData = this.dataNormalizer.normalizeTaxAssessmentData(taxData, job.params);
      
      if (normalizedData && job.params?.property_id) {
        await this.saveTaxAssessment(normalizedData, job.params.property_id);
      }

      return {
        success: true,
        data: normalizedData,
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTime: 0,
          dataSource: 'tax_assessor',
          recordCount: normalizedData ? 1 : 0
        }
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Generic property listings scraper
   */
  private async scrapePropertyListings(job: ScrapingJob): Promise<ScrapingResult> {
    // Implementation for various property listing sites
    // This would include sites like LoopNet, Crexi, etc.
    return {
      success: true,
      data: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'property_listings',
        recordCount: 0
      }
    };
  }

  // Helper methods for database operations
  private async saveMarketData(data: any, source: string) {
    // Implementation to save market data
  }

  private async savePropertyListing(listing: any) {
    // Implementation to save property listing
  }

  private async saveResearchReport(report: any) {
    // Implementation to save research report
  }

  private async saveEconomicIndicator(indicator: any) {
    // Implementation to save economic indicator
  }

  private async saveTaxAssessment(assessment: any, propertyId: string) {
    // Implementation to save tax assessment
  }

  private async getTaxAssessorConfig(county?: string, state?: string) {
    if (!county || !state) return null;
    
    return await this.prisma.taxAssessorSource.findFirst({
      where: { county, state, is_active: true }
    });
  }

  private async performTaxAssessorSearch(page: Page, address: string, config: any) {
    // Implementation for performing search on tax assessor website
  }
}