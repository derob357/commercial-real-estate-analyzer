import { chromium, type Browser, type Page } from 'playwright';
import cheerio from 'cheerio';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../index';
import { RateLimiter } from '../utils/RateLimiter';
import { DataNormalizer } from '../utils/DataNormalizer';

export interface InstitutionalScrapingJob {
  id: string;
  source: 'cbre' | 'colliers' | 'jll' | 'cushman_wakefield';
  jobType: 'properties' | 'research' | 'transactions' | 'market_data';
  url: string;
  searchParams?: {
    zipCode?: string;
    metroArea?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minCapRate?: number;
    maxCapRate?: number;
  };
  priority: number;
  retryCount: number;
  maxRetries: number;
}

export interface InstitutionalScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    scrapedAt: string;
    processingTime: number;
    dataSource: string;
    recordCount: number;
    dataQualityScore: number;
  };
}

export class InstitutionalScrapers {
  private prisma: PrismaClient;
  private browser: Browser | null = null;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private dataNormalizer: DataNormalizer;
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  constructor() {
    this.prisma = new PrismaClient();
    this.dataNormalizer = new DataNormalizer();
    this.initializeRateLimiters();
  }

  private initializeRateLimiters() {
    // Conservative rate limiting for institutional sources
    this.rateLimiters.set('cbre', new RateLimiter(15, 60000)); // 15 requests per minute
    this.rateLimiters.set('colliers', new RateLimiter(12, 60000)); // 12 requests per minute
    this.rateLimiters.set('jll', new RateLimiter(10, 60000)); // 10 requests per minute
    this.rateLimiters.set('cushman_wakefield', new RateLimiter(8, 60000)); // 8 requests per minute
  }

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      logger.info('Institutional scrapers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize institutional scrapers:', error);
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

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Execute institutional scraping job
   */
  async executeJob(job: InstitutionalScrapingJob): Promise<InstitutionalScrapingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting institutional scraping: ${job.source} - ${job.jobType} - ${job.url}`);

      // Apply rate limiting
      const rateLimiter = this.rateLimiters.get(job.source);
      if (rateLimiter) {
        await rateLimiter.waitForToken();
      }

      let result: InstitutionalScrapingResult;

      switch (job.source) {
        case 'cbre':
          result = await this.scrapeCBRE(job);
          break;
        case 'colliers':
          result = await this.scrapeColliers(job);
          break;
        case 'jll':
          result = await this.scrapeJLL(job);
          break;
        case 'cushman_wakefield':
          result = await this.scrapeCushmanWakefield(job);
          break;
        default:
          throw new Error(`Unknown institutional source: ${job.source}`);
      }

      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        // Update job status
        await this.prisma.institutionalScrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completed_at: new Date(),
            processing_time_ms: processingTime,
            results_count: result.metadata?.recordCount || 0,
            results: JSON.stringify(result.data),
            data_quality_score: result.metadata?.dataQualityScore || 0
          }
        });

        logger.info(`Institutional scraping completed: ${job.source} - ${job.jobType} in ${processingTime}ms`);
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
      logger.error(`Institutional scraping failed: ${job.source} - ${job.jobType}`, error);
      
      await this.prisma.institutionalScrapeJob.update({
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
   * Scrape CBRE for properties, research, and market data
   */
  private async scrapeCBRE(job: InstitutionalScrapingJob): Promise<InstitutionalScrapingResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Add realistic headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      await page.goto(job.url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for dynamic content to load
      await page.waitForTimeout(3000);

      let result: InstitutionalScrapingResult;

      switch (job.jobType) {
        case 'properties':
          result = await this.scrapeCBREProperties(page);
          break;
        case 'research':
          result = await this.scrapeCBREResearch(page);
          break;
        case 'transactions':
          result = await this.scrapeCBRETransactions(page);
          break;
        case 'market_data':
          result = await this.scrapeCBREMarketData(page);
          break;
        default:
          throw new Error(`Unknown job type for CBRE: ${job.jobType}`);
      }

      return result;

    } finally {
      await page.close();
    }
  }

  private async scrapeCBREProperties(page: Page): Promise<InstitutionalScrapingResult> {
    const properties = await page.evaluate(() => {
      const propertyElements = document.querySelectorAll(
        '.property-item, .listing-item, .property-card, .search-result-item, [data-testid="property-card"]'
      );
      
      const extractedProperties: any[] = [];

      propertyElements.forEach((element) => {
        const property: any = {};
        
        // Extract basic property information
        property.address = element.querySelector('.address, .property-address, .listing-address')?.textContent?.trim();
        property.city = element.querySelector('.city, .location-city')?.textContent?.trim();
        property.state = element.querySelector('.state, .location-state')?.textContent?.trim();
        property.zipCode = element.querySelector('.zip, .postal-code')?.textContent?.trim();
        
        // Extract financial information
        const priceElement = element.querySelector('.price, .asking-price, .list-price, .sale-price');
        if (priceElement) {
          const priceText = priceElement.textContent?.trim();
          if (priceText) {
            const priceMatch = priceText.match(/\$?([\d,]+(?:\.\d{2})?)/);
            if (priceMatch) {
              property.listingPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            }
          }
        }

        // Extract cap rate
        const capRateElement = element.querySelector('.cap-rate, .capitalization-rate, [data-label="cap-rate"]');
        if (capRateElement) {
          const capRateText = capRateElement.textContent?.trim();
          if (capRateText) {
            const capRateMatch = capRateText.match(/(\d+\.?\d*)%?/);
            if (capRateMatch) {
              property.capRate = parseFloat(capRateMatch[1]) / 100;
            }
          }
        }

        // Extract property details
        property.propertyType = element.querySelector('.property-type, .asset-type, .type')?.textContent?.trim();
        property.units = element.querySelector('.units, .unit-count')?.textContent?.match(/\d+/)?.[0];
        property.sqft = element.querySelector('.sqft, .square-feet, .sf')?.textContent?.match(/[\d,]+/)?.[0]?.replace(/,/g, '');
        property.yearBuilt = element.querySelector('.year-built, .built')?.textContent?.match(/\d{4}/)?.[0];

        // Extract agent/broker information
        property.listingAgent = element.querySelector('.agent-name, .broker-name')?.textContent?.trim();
        property.listingFirm = 'CBRE';

        // Extract description
        property.description = element.querySelector('.description, .property-description, .summary')?.textContent?.trim();

        // Extract listing URL
        const linkElement = element.querySelector('a[href]');
        if (linkElement) {
          property.externalUrl = linkElement.getAttribute('href');
          if (property.externalUrl && !property.externalUrl.startsWith('http')) {
            property.externalUrl = 'https://www.cbre.com' + property.externalUrl;
          }
        }

        // Extract property ID
        const idElement = element.querySelector('[data-property-id], [data-listing-id]');
        if (idElement) {
          property.propertyId = idElement.getAttribute('data-property-id') || idElement.getAttribute('data-listing-id');
        }

        if (property.address || property.listingPrice) {
          extractedProperties.push(property);
        }
      });

      return extractedProperties;
    });

    // Normalize and save properties
    const normalizedProperties = await this.normalizeCBREProperties(properties);
    
    for (const property of normalizedProperties) {
      await this.saveInstitutionalProperty(property, 'cbre');
    }

    const dataQualityScore = this.calculateDataQuality(normalizedProperties);

    return {
      success: true,
      data: normalizedProperties,
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'cbre',
        recordCount: normalizedProperties.length,
        dataQualityScore
      }
    };
  }

  private async scrapeCBREResearch(page: Page): Promise<InstitutionalScrapingResult> {
    const reports = await page.evaluate(() => {
      const reportElements = document.querySelectorAll(
        '.research-item, .report-item, .publication-item, .insight-item, [data-testid="research-card"]'
      );
      
      const extractedReports: any[] = [];

      reportElements.forEach((element) => {
        const report: any = {};
        
        report.title = element.querySelector('.title, .report-title, .research-title')?.textContent?.trim();
        report.summary = element.querySelector('.summary, .excerpt, .description')?.textContent?.trim();
        report.reportType = element.querySelector('.type, .category, .report-type')?.textContent?.trim();
        report.marketArea = element.querySelector('.market, .region, .geography')?.textContent?.trim();
        report.publicationDate = element.querySelector('.date, .published-date, .pub-date')?.textContent?.trim();
        report.author = element.querySelector('.author, .analyst')?.textContent?.trim();

        const linkElement = element.querySelector('a[href]');
        if (linkElement) {
          report.sourceUrl = linkElement.getAttribute('href');
          if (report.sourceUrl && !report.sourceUrl.startsWith('http')) {
            report.sourceUrl = 'https://www.cbre.com' + report.sourceUrl;
          }
        }

        // Look for downloadable PDF links
        const pdfElement = element.querySelector('a[href*=".pdf"]');
        if (pdfElement) {
          report.downloadUrl = pdfElement.getAttribute('href');
          if (report.downloadUrl && !report.downloadUrl.startsWith('http')) {
            report.downloadUrl = 'https://www.cbre.com' + report.downloadUrl;
          }
        }

        if (report.title) {
          extractedReports.push(report);
        }
      });

      return extractedReports;
    });

    // Normalize and save research reports
    const normalizedReports = await this.normalizeCBREResearch(reports);
    
    for (const report of normalizedReports) {
      await this.saveMarketResearchReport(report, 'cbre');
    }

    const dataQualityScore = this.calculateDataQuality(normalizedReports);

    return {
      success: true,
      data: normalizedReports,
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'cbre',
        recordCount: normalizedReports.length,
        dataQualityScore
      }
    };
  }

  private async scrapeCBRETransactions(page: Page): Promise<InstitutionalScrapingResult> {
    const transactions = await page.evaluate(() => {
      const transactionElements = document.querySelectorAll(
        '.transaction-item, .sale-item, .closed-deal, [data-testid="transaction-card"]'
      );
      
      const extractedTransactions: any[] = [];

      transactionElements.forEach((element) => {
        const transaction: any = {};
        
        transaction.propertyAddress = element.querySelector('.address, .property-address')?.textContent?.trim();
        transaction.city = element.querySelector('.city, .location-city')?.textContent?.trim();
        transaction.state = element.querySelector('.state, .location-state')?.textContent?.trim();
        transaction.zipCode = element.querySelector('.zip, .postal-code')?.textContent?.trim();
        
        // Extract sale information
        const salePriceElement = element.querySelector('.sale-price, .transaction-price, .price');
        if (salePriceElement) {
          const priceText = salePriceElement.textContent?.trim();
          if (priceText) {
            const priceMatch = priceText.match(/\$?([\d,]+(?:\.\d{2})?)/);
            if (priceMatch) {
              transaction.salePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            }
          }
        }

        transaction.saleDate = element.querySelector('.sale-date, .closed-date, .transaction-date')?.textContent?.trim();
        transaction.propertyType = element.querySelector('.property-type, .asset-type')?.textContent?.trim();
        transaction.units = element.querySelector('.units, .unit-count')?.textContent?.match(/\d+/)?.[0];
        transaction.sqft = element.querySelector('.sqft, .square-feet')?.textContent?.match(/[\d,]+/)?.[0]?.replace(/,/g, '');

        // Extract cap rate
        const capRateElement = element.querySelector('.cap-rate, .capitalization-rate');
        if (capRateElement) {
          const capRateText = capRateElement.textContent?.trim();
          if (capRateText) {
            const capRateMatch = capRateText.match(/(\d+\.?\d*)%?/);
            if (capRateMatch) {
              transaction.capRate = parseFloat(capRateMatch[1]) / 100;
            }
          }
        }

        transaction.buyer = element.querySelector('.buyer, .purchaser')?.textContent?.trim();
        transaction.seller = element.querySelector('.seller, .vendor')?.textContent?.trim();
        transaction.broker = element.querySelector('.broker, .agent')?.textContent?.trim() || 'CBRE';

        if (transaction.propertyAddress && transaction.salePrice) {
          extractedTransactions.push(transaction);
        }
      });

      return extractedTransactions;
    });

    // Normalize and save transactions
    const normalizedTransactions = await this.normalizeCBRETransactions(transactions);
    
    for (const transaction of normalizedTransactions) {
      await this.saveInstitutionalTransaction(transaction, 'cbre');
    }

    const dataQualityScore = this.calculateDataQuality(normalizedTransactions);

    return {
      success: true,
      data: normalizedTransactions,
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'cbre',
        recordCount: normalizedTransactions.length,
        dataQualityScore
      }
    };
  }

  private async scrapeCBREMarketData(page: Page): Promise<InstitutionalScrapingResult> {
    const marketData = await page.evaluate(() => {
      const data: any = {
        capRates: {},
        marketMetrics: {},
        trends: {}
      };

      // Extract cap rates by property type
      const capRateElements = document.querySelectorAll('.cap-rate-data, .market-metrics, .rate-table');
      capRateElements.forEach((element) => {
        const propertyType = element.querySelector('.property-type, .asset-class')?.textContent?.trim();
        const capRate = element.querySelector('.cap-rate, .rate')?.textContent?.trim();
        
        if (propertyType && capRate) {
          const rateMatch = capRate.match(/(\d+\.?\d*)%?/);
          if (rateMatch) {
            data.capRates[propertyType.toLowerCase()] = parseFloat(rateMatch[1]) / 100;
          }
        }
      });

      // Extract market metrics
      const metricsElements = document.querySelectorAll('.market-metric, .data-point');
      metricsElements.forEach((element) => {
        const metric = element.querySelector('.metric-name, .label')?.textContent?.trim();
        const value = element.querySelector('.metric-value, .value')?.textContent?.trim();
        
        if (metric && value) {
          data.marketMetrics[metric.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      });

      return data;
    });

    // Normalize and save market data
    const normalizedData = await this.normalizeCBREMarketData(marketData);
    
    if (normalizedData) {
      await this.saveInstitutionalMarketData(normalizedData, 'cbre');
    }

    const dataQualityScore = this.calculateDataQuality([normalizedData].filter(Boolean));

    return {
      success: true,
      data: normalizedData,
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'cbre',
        recordCount: normalizedData ? 1 : 0,
        dataQualityScore
      }
    };
  }

  /**
   * Placeholder methods for other institutional sources
   * These would follow similar patterns to CBRE but with source-specific selectors and logic
   */
  private async scrapeColliers(job: InstitutionalScrapingJob): Promise<InstitutionalScrapingResult> {
    // Implementation for Colliers would go here
    // Similar structure to CBRE but with Colliers-specific selectors and data extraction
    return {
      success: true,
      data: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'colliers',
        recordCount: 0,
        dataQualityScore: 0
      }
    };
  }

  private async scrapeJLL(job: InstitutionalScrapingJob): Promise<InstitutionalScrapingResult> {
    // Implementation for JLL would go here
    return {
      success: true,
      data: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'jll',
        recordCount: 0,
        dataQualityScore: 0
      }
    };
  }

  private async scrapeCushmanWakefield(job: InstitutionalScrapingJob): Promise<InstitutionalScrapingResult> {
    // Implementation for Cushman & Wakefield would go here
    return {
      success: true,
      data: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTime: 0,
        dataSource: 'cushman_wakefield',
        recordCount: 0,
        dataQualityScore: 0
      }
    };
  }

  // Data normalization methods
  private async normalizeCBREProperties(properties: any[]): Promise<any[]> {
    return properties.map(prop => ({
      ...prop,
      source: 'cbre',
      propertyId: prop.propertyId || `cbre_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataConfidence: this.calculatePropertyConfidence(prop),
      lastVerified: new Date()
    }));
  }

  private async normalizeCBREResearch(reports: any[]): Promise<any[]> {
    return reports.map(report => ({
      ...report,
      source: 'cbre',
      extractionConfidence: this.calculateResearchConfidence(report)
    }));
  }

  private async normalizeCBRETransactions(transactions: any[]): Promise<any[]> {
    return transactions.map(trans => ({
      ...trans,
      source: 'cbre',
      dataConfidence: this.calculateTransactionConfidence(trans)
    }));
  }

  private async normalizeCBREMarketData(data: any): Promise<any> {
    return {
      ...data,
      source: 'cbre',
      measurementDate: new Date(),
      dataConfidence: this.calculateMarketDataConfidence(data)
    };
  }

  // Data quality calculation methods
  private calculateDataQuality(data: any[]): number {
    if (!data || data.length === 0) return 0;
    
    let totalScore = 0;
    let count = 0;

    data.forEach(item => {
      if (item.dataConfidence || item.extractionConfidence) {
        totalScore += item.dataConfidence || item.extractionConfidence || 0;
        count++;
      }
    });

    return count > 0 ? totalScore / count : 0.5;
  }

  private calculatePropertyConfidence(property: any): number {
    let score = 0;
    let maxScore = 0;

    // Required fields
    maxScore += 4;
    if (property.address) score += 1;
    if (property.city && property.state) score += 1;
    if (property.propertyType) score += 1;
    if (property.listingPrice) score += 1;

    // Optional but valuable fields
    maxScore += 6;
    if (property.capRate) score += 1;
    if (property.units) score += 1;
    if (property.sqft) score += 1;
    if (property.yearBuilt) score += 1;
    if (property.description) score += 1;
    if (property.externalUrl) score += 1;

    return score / maxScore;
  }

  private calculateResearchConfidence(report: any): number {
    let score = 0;
    let maxScore = 0;

    maxScore += 3;
    if (report.title) score += 1;
    if (report.publicationDate) score += 1;
    if (report.sourceUrl) score += 1;

    maxScore += 4;
    if (report.summary) score += 1;
    if (report.reportType) score += 1;
    if (report.marketArea) score += 1;
    if (report.downloadUrl) score += 1;

    return score / maxScore;
  }

  private calculateTransactionConfidence(transaction: any): number {
    let score = 0;
    let maxScore = 0;

    maxScore += 4;
    if (transaction.propertyAddress) score += 1;
    if (transaction.salePrice) score += 1;
    if (transaction.saleDate) score += 1;
    if (transaction.propertyType) score += 1;

    maxScore += 3;
    if (transaction.capRate) score += 1;
    if (transaction.buyer || transaction.seller) score += 1;
    if (transaction.units || transaction.sqft) score += 1;

    return score / maxScore;
  }

  private calculateMarketDataConfidence(data: any): number {
    let score = 0;
    let maxScore = 1;

    if (data.capRates && Object.keys(data.capRates).length > 0) score += 0.5;
    if (data.marketMetrics && Object.keys(data.marketMetrics).length > 0) score += 0.5;

    return score / maxScore;
  }

  // Database save methods
  private async saveInstitutionalProperty(property: any, source: string) {
    try {
      await this.prisma.institutionalProperty.upsert({
        where: {
          source_property_id: {
            source,
            property_id: property.propertyId
          }
        },
        update: {
          ...property,
          updated_at: new Date()
        },
        create: {
          ...property,
          source
        }
      });
    } catch (error) {
      logger.error(`Failed to save institutional property from ${source}:`, error);
    }
  }

  private async saveMarketResearchReport(report: any, source: string) {
    try {
      await this.prisma.marketResearchReport.upsert({
        where: {
          source_title_publication_date: {
            source,
            title: report.title,
            publication_date: new Date(report.publicationDate || Date.now())
          }
        },
        update: {
          ...report,
          updated_at: new Date()
        },
        create: {
          ...report,
          source,
          publication_date: new Date(report.publicationDate || Date.now())
        }
      });
    } catch (error) {
      logger.error(`Failed to save research report from ${source}:`, error);
    }
  }

  private async saveInstitutionalTransaction(transaction: any, source: string) {
    try {
      await this.prisma.institutionalTransaction.upsert({
        where: {
          source_property_address_sale_date: {
            source,
            property_address: transaction.propertyAddress,
            sale_date: new Date(transaction.saleDate || Date.now())
          }
        },
        update: {
          ...transaction,
          updated_at: new Date()
        },
        create: {
          ...transaction,
          source,
          sale_date: new Date(transaction.saleDate || Date.now())
        }
      });
    } catch (error) {
      logger.error(`Failed to save institutional transaction from ${source}:`, error);
    }
  }

  private async saveInstitutionalMarketData(data: any, source: string) {
    try {
      await this.prisma.institutionalMarketData.create({
        data: {
          ...data,
          source
        }
      });
    } catch (error) {
      logger.error(`Failed to save institutional market data from ${source}:`, error);
    }
  }
}