import { prisma } from '../database'
import FuzzySearch from 'fuzzy-search'
import { getDistance } from 'geolib'

export interface NormalizedAddress {
  streetNumber?: string
  streetName?: string
  unitNumber?: string
  city?: string
  state?: string
  zipCode?: string
  zipPlusFour?: string
  county?: string
  latitude?: number
  longitude?: number
  confidenceScore?: number
}

export interface AddressMatchResult {
  originalAddress: string
  normalizedAddress: string
  confidence: number
  matches: {
    exact?: boolean
    fuzzy?: boolean
    geocoded?: boolean
  }
  suggestions?: string[]
}

export class AddressNormalizer {
  
  private static stateAbbreviations: { [key: string]: string } = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  }

  private static streetSuffixes: { [key: string]: string } = {
    'st': 'ST', 'street': 'ST', 'ave': 'AVE', 'avenue': 'AVE', 'blvd': 'BLVD', 'boulevard': 'BLVD',
    'rd': 'RD', 'road': 'RD', 'dr': 'DR', 'drive': 'DR', 'ln': 'LN', 'lane': 'LN',
    'ct': 'CT', 'court': 'CT', 'pl': 'PL', 'place': 'PL', 'cir': 'CIR', 'circle': 'CIR',
    'way': 'WAY', 'pkwy': 'PKWY', 'parkway': 'PKWY', 'ter': 'TER', 'terrace': 'TER',
    'trl': 'TRL', 'trail': 'TRL', 'loop': 'LOOP', 'sq': 'SQ', 'square': 'SQ'
  }

  private static directionals: { [key: string]: string } = {
    'n': 'N', 'north': 'N', 's': 'S', 'south': 'S', 'e': 'E', 'east': 'E', 
    'w': 'W', 'west': 'W', 'ne': 'NE', 'northeast': 'NE', 'nw': 'NW', 'northwest': 'NW',
    'se': 'SE', 'southeast': 'SE', 'sw': 'SW', 'southwest': 'SW'
  }

  static normalizeAddress(address: string): NormalizedAddress {
    if (!address || typeof address !== 'string') {
      return { confidenceScore: 0 }
    }

    const original = address.trim()
    let normalized = original.toUpperCase()

    // Remove extra whitespace and special characters
    normalized = normalized.replace(/[^\w\s#\-]/g, ' ').replace(/\s+/g, ' ').trim()

    // Parse components
    const result: NormalizedAddress = {}
    let confidenceScore = 0.5 // Base confidence

    // Extract ZIP code (5 digits or 5+4 format)
    const zipMatch = normalized.match(/\b(\d{5})(?:-(\d{4}))?\b/)
    if (zipMatch) {
      result.zipCode = zipMatch[1]
      if (zipMatch[2]) {
        result.zipPlusFour = zipMatch[2]
      }
      normalized = normalized.replace(zipMatch[0], '').trim()
      confidenceScore += 0.2
    }

    // Extract state (2-letter abbreviation or full name)
    const statePattern = /\b([A-Z]{2})\b|\b(ALABAMA|ALASKA|ARIZONA|ARKANSAS|CALIFORNIA|COLORADO|CONNECTICUT|DELAWARE|FLORIDA|GEORGIA|HAWAII|IDAHO|ILLINOIS|INDIANA|IOWA|KANSAS|KENTUCKY|LOUISIANA|MAINE|MARYLAND|MASSACHUSETTS|MICHIGAN|MINNESOTA|MISSISSIPPI|MISSOURI|MONTANA|NEBRASKA|NEVADA|NEW HAMPSHIRE|NEW JERSEY|NEW MEXICO|NEW YORK|NORTH CAROLINA|NORTH DAKOTA|OHIO|OKLAHOMA|OREGON|PENNSYLVANIA|RHODE ISLAND|SOUTH CAROLINA|SOUTH DAKOTA|TENNESSEE|TEXAS|UTAH|VERMONT|VIRGINIA|WASHINGTON|WEST VIRGINIA|WISCONSIN|WYOMING)\b/
    const stateMatch = normalized.match(statePattern)
    if (stateMatch) {
      const state = stateMatch[1] || stateMatch[2]
      result.state = state.length === 2 ? state : this.stateAbbreviations[state.toLowerCase()]
      normalized = normalized.replace(stateMatch[0], '').trim()
      confidenceScore += 0.15
    }

    // Split remaining parts
    const parts = normalized.split(',').map(p => p.trim()).filter(p => p.length > 0)
    
    if (parts.length >= 2) {
      // Last part before state/zip should be city
      result.city = parts[parts.length - 1]
      confidenceScore += 0.1

      // First part should be street address
      const streetPart = parts[0]
      this.parseStreetAddress(streetPart, result)
      if (result.streetNumber && result.streetName) {
        confidenceScore += 0.15
      }
    } else if (parts.length === 1) {
      // Only street address provided
      this.parseStreetAddress(parts[0], result)
      if (result.streetNumber && result.streetName) {
        confidenceScore += 0.1
      }
    }

    result.confidenceScore = Math.min(confidenceScore, 1.0)
    return result
  }

  private static parseStreetAddress(streetPart: string, result: NormalizedAddress): void {
    let remaining = streetPart.trim()

    // Extract unit number (apt, unit, suite, etc.)
    const unitPattern = /\b(APT|APARTMENT|UNIT|SUITE|STE|#)\s*([A-Z0-9]+)\b/i
    const unitMatch = remaining.match(unitPattern)
    if (unitMatch) {
      result.unitNumber = unitMatch[2]
      remaining = remaining.replace(unitMatch[0], '').trim()
    }

    // Extract street number (including ranges like 123-125)
    const numberPattern = /^(\d+(?:-\d+)?(?:[A-Z])?)\s+/
    const numberMatch = remaining.match(numberPattern)
    if (numberMatch) {
      result.streetNumber = numberMatch[1]
      remaining = remaining.replace(numberMatch[0], '').trim()
    }

    // Normalize directionals and suffixes in remaining text
    const words = remaining.split(/\s+/)
    const normalizedWords = words.map(word => {
      const lower = word.toLowerCase()
      return this.directionals[lower] || this.streetSuffixes[lower] || word
    })

    result.streetName = normalizedWords.join(' ').trim()
  }

  static async findSimilarAddresses(
    targetAddress: string, 
    zipCode?: string, 
    maxResults = 5
  ): Promise<AddressMatchResult[]> {
    const normalized = this.normalizeAddress(targetAddress)
    const normalizedString = this.buildNormalizedString(normalized)

    // First, try exact match
    const exactMatch = await prisma.address.findUnique({
      where: { normalized_address: normalizedString }
    })

    if (exactMatch) {
      return [{
        originalAddress: targetAddress,
        normalizedAddress: normalizedString,
        confidence: 1.0,
        matches: { exact: true }
      }]
    }

    // Get all addresses in the same ZIP code for fuzzy matching
    let candidates = await prisma.address.findMany({
      where: zipCode ? { zip_code: zipCode } : {},
      take: 1000 // Limit for performance
    })

    if (candidates.length === 0 && zipCode) {
      // Expand search to nearby ZIP codes if no results
      candidates = await prisma.address.findMany({
        take: 1000
      })
    }

    // Perform fuzzy matching
    const fuzzySearch = new FuzzySearch(candidates, ['normalized_address', 'original_address'], {
      caseSensitive: false,
      sort: true
    })

    const fuzzyMatches = fuzzySearch.search(targetAddress).slice(0, maxResults)

    return fuzzyMatches.map(match => ({
      originalAddress: targetAddress,
      normalizedAddress: match.normalized_address,
      confidence: this.calculateSimilarity(normalizedString, match.normalized_address),
      matches: { fuzzy: true }
    }))
  }

  static async saveNormalizedAddress(
    originalAddress: string, 
    normalizedData: NormalizedAddress
  ): Promise<string> {
    const normalizedString = this.buildNormalizedString(normalizedData)

    const saved = await prisma.address.upsert({
      where: { normalized_address: normalizedString },
      update: {
        confidence_score: normalizedData.confidenceScore
      },
      create: {
        original_address: originalAddress,
        normalized_address: normalizedString,
        street_number: normalizedData.streetNumber,
        street_name: normalizedData.streetName,
        unit_number: normalizedData.unitNumber,
        city: normalizedData.city,
        state: normalizedData.state,
        zip_code: normalizedData.zipCode,
        zip_plus_four: normalizedData.zipPlusFour,
        county: normalizedData.county,
        latitude: normalizedData.latitude,
        longitude: normalizedData.longitude,
        confidence_score: normalizedData.confidenceScore
      }
    })

    return saved.id
  }

  private static buildNormalizedString(normalized: NormalizedAddress): string {
    const parts: string[] = []

    if (normalized.streetNumber) parts.push(normalized.streetNumber)
    if (normalized.streetName) parts.push(normalized.streetName)
    if (normalized.unitNumber) parts.push(`#${normalized.unitNumber}`)
    if (normalized.city) parts.push(normalized.city)
    if (normalized.state) parts.push(normalized.state)
    if (normalized.zipCode) {
      const zip = normalized.zipPlusFour 
        ? `${normalized.zipCode}-${normalized.zipPlusFour}`
        : normalized.zipCode
      parts.push(zip)
    }

    return parts.join(' ')
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Geographic matching for properties within a certain distance
  static async findNearbyProperties(
    latitude: number, 
    longitude: number, 
    radiusKm = 1
  ): Promise<any[]> {
    const properties = await prisma.property.findMany({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    })

    return properties.filter(property => {
      if (!property.latitude || !property.longitude) return false
      
      const distance = getDistance(
        { latitude, longitude },
        { latitude: property.latitude, longitude: property.longitude }
      )
      
      return distance <= radiusKm * 1000 // Convert km to meters
    })
  }

  // Cross-reference property addresses with tax assessor records
  static async matchPropertyToTaxRecord(
    propertyAddress: string, 
    zipCode: string
  ): Promise<{ confidence: number; suggestions: string[] }> {
    const normalized = this.normalizeAddress(propertyAddress)
    const suggestions: string[] = []
    let confidence = 0

    // Look for similar addresses in the database
    const similarAddresses = await this.findSimilarAddresses(propertyAddress, zipCode, 10)
    
    for (const match of similarAddresses) {
      if (match.confidence > 0.8) {
        confidence = Math.max(confidence, match.confidence)
        suggestions.push(match.normalizedAddress)
      }
    }

    // If no good matches, suggest common variations
    if (confidence < 0.7) {
      suggestions.push(
        ...this.generateAddressVariations(normalized)
      )
    }

    return { confidence, suggestions }
  }

  private static generateAddressVariations(normalized: NormalizedAddress): string[] {
    const variations: string[] = []
    
    if (!normalized.streetNumber || !normalized.streetName) {
      return variations
    }

    const baseAddress = `${normalized.streetNumber} ${normalized.streetName}`
    
    // Try different suffix variations
    const streetName = normalized.streetName
    for (const [abbrev, full] of Object.entries(this.streetSuffixes)) {
      if (streetName.includes(full)) {
        variations.push(baseAddress.replace(full, abbrev))
      } else if (streetName.includes(abbrev)) {
        variations.push(baseAddress.replace(abbrev, full))
      }
    }

    // Try directional variations
    for (const [abbrev, full] of Object.entries(this.directionals)) {
      if (streetName.includes(full)) {
        variations.push(baseAddress.replace(full, abbrev))
      } else if (streetName.includes(abbrev)) {
        variations.push(baseAddress.replace(abbrev, full))
      }
    }

    return variations.slice(0, 5) // Limit variations
  }
}