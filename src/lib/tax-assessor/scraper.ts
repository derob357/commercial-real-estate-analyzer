import { chromium, type Browser, type Page } from 'playwright'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { prisma } from '../database'
import { TaxAssessorMapper } from './mapping'

export interface TaxAssessorData {
  assessedValue?: number
  landValue?: number
  improvementValue?: number
  totalValue?: number
  taxRate?: number
  annualTaxes?: number
  assessmentYear?: number
  assessmentDate?: Date
  exemptions?: string[]
  propertyClass?: string
  parcelId?: string
  ownerName?: string
  propertyDescription?: string
  squareFootage?: number
  yearBuilt?: number
  lastSaleDate?: Date
  lastSalePrice?: number
}

export interface ScrapeResult {
  success: boolean
  data?: TaxAssessorData
  error?: string
  source: string
  scrapedAt: Date
}

export class TaxAssessorScraper {
  private browser: Browser | null = null
  private userAgent: string
  private defaultTimeout: number

  constructor() {
    this.userAgent = process.env.SCRAPING_USER_AGENT || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    this.defaultTimeout = Number.parseInt(process.env.TAX_ASSESSOR_TIMEOUT_MS || '30000')
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })
    }
    return this.browser
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async scrapeByZipCode(zipCode: string, address: string): Promise<ScrapeResult> {
    try {
      const assessor = await TaxAssessorMapper.getAssessorForZipCode(zipCode)
      
      if (!assessor) {
        return {
          success: false,
          error: `No tax assessor configuration found for ZIP code ${zipCode}`,
          source: 'unknown',
          scrapedAt: new Date()
        }
      }

      return await this.scrapeAssessor(assessor, address)
    } catch (error) {
      return {
        success: false,
        error: `Error scraping tax data: ${error}`,
        source: 'unknown',
        scrapedAt: new Date()
      }
    }
  }

  async scrapeByCounty(county: string, state: string, address: string): Promise<ScrapeResult> {
    try {
      const assessor = await TaxAssessorMapper.getAssessorForCounty(county, state)
      
      if (!assessor) {
        return {
          success: false,
          error: `No tax assessor configuration found for ${county}, ${state}`,
          source: `${county}, ${state}`,
          scrapedAt: new Date()
        }
      }

      return await this.scrapeAssessor(assessor, address)
    } catch (error) {
      return {
        success: false,
        error: `Error scraping tax data: ${error}`,
        source: `${county}, ${state}`,
        scrapedAt: new Date()
      }
    }
  }

  private async scrapeAssessor(assessor: any, address: string): Promise<ScrapeResult> {
    const source = `${assessor.county}, ${assessor.state}`
    
    try {
      // Apply rate limiting
      await this.sleep(assessor.rate_limit_ms)

      let result: ScrapeResult

      if (assessor.requires_javascript) {
        result = await this.scrapeWithPlaywright(assessor, address)
      } else {
        result = await this.scrapeWithAxios(assessor, address)
      }

      // Update assessor statistics
      await TaxAssessorMapper.updateAssessorStats(
        assessor.county,
        assessor.state,
        result.success,
        result.error
      )

      return result

    } catch (error) {
      const errorResult = {
        success: false,
        error: `Scraping failed: ${error}`,
        source,
        scrapedAt: new Date()
      }

      await TaxAssessorMapper.updateAssessorStats(
        assessor.county,
        assessor.state,
        false,
        errorResult.error
      )

      return errorResult
    }
  }

  private async scrapeWithPlaywright(assessor: any, address: string): Promise<ScrapeResult> {
    const browser = await this.initBrowser()
    const page = await browser.newPage()
    
    try {
      await page.setUserAgent(this.userAgent)
      await page.setViewportSize({ width: 1366, height: 768 })

      // Navigate to assessor website
      await page.goto(assessor.assessor_url, { 
        waitUntil: 'networkidle', 
        timeout: this.defaultTimeout 
      })

      const data = await this.performSearch(page, assessor, address)
      
      return {
        success: true,
        data,
        source: `${assessor.county}, ${assessor.state}`,
        scrapedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        error: `Playwright scraping failed: ${error}`,
        source: `${assessor.county}, ${assessor.state}`,
        scrapedAt: new Date()
      }
    } finally {
      await page.close()
    }
  }

  private async scrapeWithAxios(assessor: any, address: string): Promise<ScrapeResult> {
    try {
      const response = await axios.get(assessor.assessor_url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: this.defaultTimeout
      })

      const $ = cheerio.load(response.data)
      const data = this.extractDataWithCheerio($, assessor, address)

      return {
        success: true,
        data,
        source: `${assessor.county}, ${assessor.state}`,
        scrapedAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        error: `Axios scraping failed: ${error}`,
        source: `${assessor.county}, ${assessor.state}`,
        scrapedAt: new Date()
      }
    }
  }

  private async performSearch(page: Page, assessor: any, address: string): Promise<TaxAssessorData> {
    const selectors = JSON.parse(assessor.selectors || '{}')
    
    // County-specific search implementations
    switch (assessor.county) {
      case 'Los Angeles':
        return await this.searchLosAngeles(page, address, selectors)
      case 'Cook':
        return await this.searchCook(page, address, selectors)
      case 'Harris':
        return await this.searchHarris(page, address, selectors)
      case 'New York':
        return await this.searchNewYork(page, address, selectors)
      case 'Maricopa':
        return await this.searchMaricopa(page, address, selectors)
      default:
        return await this.genericSearch(page, address, selectors)
    }
  }

  private async searchLosAngeles(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // Navigate to search page
    await page.goto('https://portal.assessor.lacounty.gov/', { waitUntil: 'networkidle' })
    
    // Wait for search input and enter address
    await page.waitForSelector('#property-search-input', { timeout: 10000 })
    await page.fill('#property-search-input', address)
    await page.click('[data-testid="search-button"]')
    
    // Wait for results
    await page.waitForSelector('[data-testid="property-result"]', { timeout: 15000 })
    
    // Click on first result
    await page.click('[data-testid="property-result"]:first-child')
    
    // Wait for property details page
    await page.waitForSelector('[data-testid="assessed-value"]', { timeout: 10000 })
    
    // Extract data
    return {
      assessedValue: await this.extractNumericValue(page, '[data-testid="assessed-value"]'),
      landValue: await this.extractNumericValue(page, '[data-testid="land-value"]'),
      improvementValue: await this.extractNumericValue(page, '[data-testid="improvement-value"]'),
      annualTaxes: await this.extractNumericValue(page, '[data-testid="tax-amount"]'),
      assessmentYear: new Date().getFullYear(),
      parcelId: await this.extractTextValue(page, '[data-testid="parcel-id"]')
    }
  }

  private async searchCook(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // Cook County (Chicago) implementation
    await page.goto('https://www.cookcountyassessor.com/property-search', { waitUntil: 'networkidle' })
    
    await page.waitForSelector('#address-search', { timeout: 10000 })
    await page.fill('#address-search', address)
    await page.click('.search-button')
    
    await page.waitForSelector('.property-result', { timeout: 15000 })
    await page.click('.property-result:first-child')
    
    await page.waitForSelector('.assessed-value', { timeout: 10000 })
    
    return {
      assessedValue: await this.extractNumericValue(page, '.assessed-value'),
      marketValue: await this.extractNumericValue(page, '.market-value'),
      assessmentYear: new Date().getFullYear(),
      parcelId: await this.extractTextValue(page, '.property-pin')
    }
  }

  private async searchHarris(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // Harris County (Houston) implementation
    await page.goto('https://hcad.org/property-search/', { waitUntil: 'networkidle' })
    
    await page.waitForSelector('#quick-search', { timeout: 10000 })
    await page.fill('#quick-search', address)
    await page.click('#search-btn')
    
    await page.waitForSelector('.search-results', { timeout: 15000 })
    await page.click('.search-results tr:first-child a')
    
    await page.waitForSelector('.property-details', { timeout: 10000 })
    
    return {
      totalValue: await this.extractNumericValue(page, '.total-value'),
      landValue: await this.extractNumericValue(page, '.land-value'),
      improvementValue: await this.extractNumericValue(page, '.improvement-value'),
      assessmentYear: new Date().getFullYear()
    }
  }

  private async searchNewYork(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // NYC implementation
    await page.goto('https://a836-acris.nyc.gov/bblsearch/bblsearch.asp', { waitUntil: 'networkidle' })
    
    await page.waitForSelector('#address', { timeout: 10000 })
    await page.fill('#address', address)
    await page.click('#search')
    
    await page.waitForSelector('.results-table', { timeout: 15000 })
    await page.click('.results-table tr:first-child a')
    
    await page.waitForSelector('.property-info', { timeout: 10000 })
    
    return {
      assessedValue: await this.extractNumericValue(page, '.assessed-value'),
      annualTaxes: await this.extractNumericValue(page, '.tax-amount'),
      propertyClass: await this.extractTextValue(page, '.property-class'),
      assessmentYear: new Date().getFullYear()
    }
  }

  private async searchMaricopa(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // Maricopa County (Phoenix) implementation
    await page.goto('https://mcassessor.maricopa.gov/property-search', { waitUntil: 'networkidle' })
    
    await page.waitForSelector('#property-address', { timeout: 10000 })
    await page.fill('#property-address', address)
    await page.click('#search-submit')
    
    await page.waitForSelector('.property-results', { timeout: 15000 })
    await page.click('.property-results .result-item:first-child a')
    
    await page.waitForSelector('.property-detail', { timeout: 10000 })
    
    return {
      assessedValue: await this.extractNumericValue(page, '.assessed-value'),
      totalValue: await this.extractNumericValue(page, '.full-cash-value'),
      parcelId: await this.extractTextValue(page, '.parcel-number'),
      assessmentYear: new Date().getFullYear()
    }
  }

  private async genericSearch(page: Page, address: string, selectors: any): Promise<TaxAssessorData> {
    // Generic implementation for other counties
    // This would use the selectors defined in the assessor configuration
    
    // Try to find common search patterns
    const searchSelectors = [
      '#address', '#property-address', '#search-address', 
      '.address-input', '.property-search', '[name="address"]'
    ]
    
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 })
        await page.fill(selector, address)
        break
      } catch (e) {
        continue
      }
    }
    
    // Try to find and click search button
    const searchButtonSelectors = [
      '#search', '#search-btn', '.search-button', 
      '[type="submit"]', '.btn-search'
    ]
    
    for (const selector of searchButtonSelectors) {
      try {
        await page.click(selector)
        break
      } catch (e) {
        continue
      }
    }
    
    // Wait for results and extract using provided selectors
    await page.waitForTimeout(3000)
    
    const data: TaxAssessorData = {}
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        if (key.includes('Value') || key.includes('Amount') || key.includes('Tax')) {
          data[key as keyof TaxAssessorData] = await this.extractNumericValue(page, selector as string)
        } else {
          data[key as keyof TaxAssessorData] = await this.extractTextValue(page, selector as string)
        }
      } catch (e) {
        console.warn(`Could not extract ${key} using selector ${selector}`)
      }
    }
    
    return data
  }

  private extractDataWithCheerio($: cheerio.CheerioAPI, assessor: any, address: string): TaxAssessorData {
    const selectors = JSON.parse(assessor.selectors || '{}')
    const data: TaxAssessorData = {}
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const element = $(selector as string)
        const text = element.text().trim()
        
        if (key.includes('Value') || key.includes('Amount') || key.includes('Tax')) {
          data[key as keyof TaxAssessorData] = this.parseNumericValue(text)
        } else {
          data[key as keyof TaxAssessorData] = text
        }
      } catch (e) {
        console.warn(`Could not extract ${key} using selector ${selector}`)
      }
    }
    
    return data
  }

  private async extractNumericValue(page: Page, selector: string): Promise<number | undefined> {
    try {
      const text = await page.textContent(selector)
      return text ? this.parseNumericValue(text) : undefined
    } catch (e) {
      return undefined
    }
  }

  private async extractTextValue(page: Page, selector: string): Promise<string | undefined> {
    try {
      const text = await page.textContent(selector)
      return text?.trim()
    } catch (e) {
      return undefined
    }
  }

  private parseNumericValue(text: string): number | undefined {
    if (!text) return undefined
    
    // Remove common currency symbols and formatting
    const cleaned = text.replace(/[$,\s]/g, '').replace(/[^\d.-]/g, '')
    const parsed = Number.parseFloat(cleaned)
    
    return isNaN(parsed) ? undefined : parsed
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Method to save scraped data to database
  async saveTaxData(propertyId: string, data: TaxAssessorData): Promise<void> {
    if (!data.assessmentYear) {
      data.assessmentYear = new Date().getFullYear()
    }

    // Save tax assessment
    if (data.assessedValue || data.totalValue || data.landValue || data.improvementValue) {
      await prisma.taxAssessment.upsert({
        where: {
          property_id: propertyId,
          assessment_year: data.assessmentYear
        },
        update: {
          assessed_value: data.assessedValue,
          land_value: data.landValue,
          improvement_value: data.improvementValue,
          total_value: data.totalValue,
          tax_rate: data.taxRate,
          annual_taxes: data.annualTaxes,
          property_class: data.propertyClass,
          updated_at: new Date()
        },
        create: {
          property_id: propertyId,
          assessment_year: data.assessmentYear,
          assessed_value: data.assessedValue,
          land_value: data.landValue,
          improvement_value: data.improvementValue,
          total_value: data.totalValue,
          tax_rate: data.taxRate,
          annual_taxes: data.annualTaxes,
          property_class: data.propertyClass
        }
      })
    }

    // Save tax payment if annual taxes are available
    if (data.annualTaxes && data.assessmentYear) {
      await prisma.taxPayment.upsert({
        where: {
          property_id: propertyId,
          tax_year: data.assessmentYear
        },
        update: {
          amount_due: data.annualTaxes,
          updated_at: new Date()
        },
        create: {
          property_id: propertyId,
          tax_year: data.assessmentYear,
          amount_due: data.annualTaxes,
          status: 'unknown'
        }
      })
    }

    // Update property with latest tax update timestamp
    await prisma.property.update({
      where: { id: propertyId },
      data: { last_tax_update: new Date() }
    })
  }
}