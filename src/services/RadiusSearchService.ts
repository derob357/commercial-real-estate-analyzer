interface ZipCodeLocation {
  zipCode: string
  latitude: number
  longitude: number
  city: string
  state: string
  county: string
}

interface Property {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  units?: number
  sqft?: number
  listingPrice?: number
  capRate?: number
  distance?: number
}

interface SearchResult {
  properties: Property[]
  searchArea: {
    centerZip: string
    radiusMiles: number
    zipCodesSearched: string[]
    totalZipCodes: number
    propertiesFound: number
  }
}

interface SearchProgress {
  zipCodesSearched: number
  totalZipCodes: number
  propertiesFound: number
  currentZip: string
  message: string
}

export class RadiusSearchService {
  // Sample zip code database with coordinates (in production, this would be a comprehensive database)
  private static zipCodeDatabase: ZipCodeLocation[] = [
    // Major metropolitan areas with sample data
    { zipCode: "90210", latitude: 34.0901, longitude: -118.4065, city: "Beverly Hills", state: "CA", county: "Los Angeles" },
    { zipCode: "90211", latitude: 34.0837, longitude: -118.4020, city: "Beverly Hills", state: "CA", county: "Los Angeles" },
    { zipCode: "90212", latitude: 34.1030, longitude: -118.4142, city: "Beverly Hills", state: "CA", county: "Los Angeles" },
    { zipCode: "90213", latitude: 34.0698, longitude: -118.3908, city: "Beverly Hills", state: "CA", county: "Los Angeles" },

    { zipCode: "10001", latitude: 40.7505, longitude: -73.9934, city: "New York", state: "NY", county: "New York" },
    { zipCode: "10002", latitude: 40.7157, longitude: -73.9860, city: "New York", state: "NY", county: "New York" },
    { zipCode: "10003", latitude: 40.7316, longitude: -73.9890, city: "New York", state: "NY", county: "New York" },
    { zipCode: "10004", latitude: 40.6892, longitude: -74.0178, city: "New York", state: "NY", county: "New York" },

    { zipCode: "75201", latitude: 32.7767, longitude: -96.7970, city: "Dallas", state: "TX", county: "Dallas" },
    { zipCode: "75202", latitude: 32.7831, longitude: -96.8067, city: "Dallas", state: "TX", county: "Dallas" },
    { zipCode: "75203", latitude: 32.7459, longitude: -96.8344, city: "Dallas", state: "TX", county: "Dallas" },
    { zipCode: "75204", latitude: 32.8040, longitude: -96.7856, city: "Dallas", state: "TX", county: "Dallas" },

    { zipCode: "60601", latitude: 41.8781, longitude: -87.6298, city: "Chicago", state: "IL", county: "Cook" },
    { zipCode: "60602", latitude: 41.8832, longitude: -87.6387, city: "Chicago", state: "IL", county: "Cook" },
    { zipCode: "60603", latitude: 41.8775, longitude: -87.6364, city: "Chicago", state: "IL", county: "Cook" },
    { zipCode: "60604", latitude: 41.8719, longitude: -87.6278, city: "Chicago", state: "IL", county: "Cook" },

    { zipCode: "33101", latitude: 25.7617, longitude: -80.1918, city: "Miami", state: "FL", county: "Miami-Dade" },
    { zipCode: "33102", latitude: 25.7753, longitude: -80.1924, city: "Miami", state: "FL", county: "Miami-Dade" },
    { zipCode: "33109", latitude: 25.7907, longitude: -80.1300, city: "Miami Beach", state: "FL", county: "Miami-Dade" },
    { zipCode: "33110", latitude: 25.7743, longitude: -80.1341, city: "Miami Beach", state: "FL", county: "Miami-Dade" },
  ]

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get zip codes within specified radius
   */
  static getZipCodesInRadius(centerZipCode: string, radiusMiles: number): ZipCodeLocation[] {
    const centerLocation = this.zipCodeDatabase.find(z => z.zipCode === centerZipCode)

    if (!centerLocation) {
      // If center zip not found, generate mock coordinates
      const mockCenter = this.generateMockCoordinates(centerZipCode)
      return this.generateMockZipCodesInRadius(mockCenter, radiusMiles)
    }

    return this.zipCodeDatabase
      .filter(zipLocation => {
        const distance = this.calculateDistance(
          centerLocation.latitude,
          centerLocation.longitude,
          zipLocation.latitude,
          zipLocation.longitude
        )
        return distance <= radiusMiles
      })
      .sort((a, b) => {
        const distanceA = this.calculateDistance(
          centerLocation.latitude, centerLocation.longitude,
          a.latitude, a.longitude
        )
        const distanceB = this.calculateDistance(
          centerLocation.latitude, centerLocation.longitude,
          b.latitude, b.longitude
        )
        return distanceA - distanceB
      })
  }

  /**
   * Generate mock coordinates for unknown zip codes
   */
  private static generateMockCoordinates(zipCode: string): ZipCodeLocation {
    // Generate coordinates based on zip code pattern
    const firstDigit = parseInt(zipCode.charAt(0))
    const baseLatitude = 25 + (firstDigit * 2.5) // Rough US latitude range
    const baseLongitude = -125 + (firstDigit * 8) // Rough US longitude range

    return {
      zipCode,
      latitude: baseLatitude + (Math.random() - 0.5) * 2,
      longitude: baseLongitude + (Math.random() - 0.5) * 2,
      city: "Unknown City",
      state: this.getStateFromZip(zipCode),
      county: "Unknown County"
    }
  }

  /**
   * Generate mock zip codes around a center point
   */
  private static generateMockZipCodesInRadius(center: ZipCodeLocation, radiusMiles: number): ZipCodeLocation[] {
    const zipCodes: ZipCodeLocation[] = [center]
    const numZipCodes = Math.floor(radiusMiles / 5) + Math.floor(Math.random() * 10) // Rough estimate

    for (let i = 0; i < numZipCodes; i++) {
      const angle = Math.random() * 2 * Math.PI
      const distance = Math.random() * radiusMiles
      const deltaLat = (distance / 69) * Math.cos(angle) // Rough conversion
      const deltaLon = (distance / 69) * Math.sin(angle) / Math.cos(this.toRadians(center.latitude))

      const baseZip = parseInt(center.zipCode)
      const newZip = (baseZip + i + 1).toString().padStart(5, '0')

      zipCodes.push({
        zipCode: newZip,
        latitude: center.latitude + deltaLat,
        longitude: center.longitude + deltaLon,
        city: `City ${i + 1}`,
        state: center.state,
        county: center.county
      })
    }

    return zipCodes
  }

  /**
   * Get approximate state from zip code
   */
  private static getStateFromZip(zipCode: string): string {
    const firstDigit = parseInt(zipCode.charAt(0))
    const stateMap: { [key: number]: string } = {
      0: "MA", 1: "NY", 2: "PA", 3: "FL", 4: "GA",
      5: "AL", 6: "TX", 7: "OK", 8: "CO", 9: "CA"
    }
    return stateMap[firstDigit] || "Unknown"
  }

  /**
   * Search for properties in a specific zip code
   */
  static async searchPropertiesInZipCode(zipCode: string): Promise<Property[]> {
    try {
      const response = await fetch(`/api/properties/search?zip_code=${zipCode}`)
      if (response.ok) {
        const data = await response.json()
        return data.properties || []
      }
      return []
    } catch (error) {
      console.error(`Error searching properties in ${zipCode}:`, error)
      return []
    }
  }

  /**
   * Generate mock properties for demonstration
   */
  static generateMockProperties(zipCode: string, count: number = 3): Property[] {
    const propertyTypes = ["Apartment", "Mixed Use", "Retail", "Office", "Industrial"]
    const properties: Property[] = []

    for (let i = 0; i < count; i++) {
      const randomType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
      properties.push({
        id: `mock_${zipCode}_${i}`,
        address: `${100 + i * 100} Main Street`,
        city: `City ${zipCode}`,
        state: this.getStateFromZip(zipCode),
        zipCode,
        propertyType: randomType,
        units: randomType === "Apartment" ? 10 + Math.floor(Math.random() * 50) : undefined,
        sqft: 5000 + Math.floor(Math.random() * 50000),
        listingPrice: 500000 + Math.floor(Math.random() * 2000000),
        capRate: 0.04 + Math.random() * 0.06
      })
    }

    return properties
  }

  /**
   * Perform radius search with progress callback
   */
  static async performRadiusSearch(
    centerZipCode: string,
    radiusMiles: number,
    onProgress?: (progress: SearchProgress) => void
  ): Promise<SearchResult> {
    const zipCodesInRadius = this.getZipCodesInRadius(centerZipCode, radiusMiles)
    const allProperties: Property[] = []
    let zipCodesSearched = 0

    onProgress?.({
      zipCodesSearched: 0,
      totalZipCodes: zipCodesInRadius.length,
      propertiesFound: 0,
      currentZip: centerZipCode,
      message: `Starting search in ${zipCodesInRadius.length} zip codes...`
    })

    // Search each zip code
    for (const zipLocation of zipCodesInRadius) {
      onProgress?.({
        zipCodesSearched,
        totalZipCodes: zipCodesInRadius.length,
        propertiesFound: allProperties.length,
        currentZip: zipLocation.zipCode,
        message: `Searching ${zipLocation.city}, ${zipLocation.state} (${zipLocation.zipCode})...`
      })

      // Add small delay to simulate real search
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        // Try to get real properties first
        let properties = await this.searchPropertiesInZipCode(zipLocation.zipCode)

        // If no real properties found, generate mock data for demonstration
        if (properties.length === 0 && Math.random() > 0.7) {
          properties = this.generateMockProperties(zipLocation.zipCode, Math.floor(Math.random() * 3) + 1)
        }

        // Add distance to each property
        const centerLocation = zipCodesInRadius[0] // First is always center
        properties.forEach(property => {
          property.distance = this.calculateDistance(
            centerLocation.latitude,
            centerLocation.longitude,
            zipLocation.latitude,
            zipLocation.longitude
          )
        })

        allProperties.push(...properties)
        zipCodesSearched++

        onProgress?.({
          zipCodesSearched,
          totalZipCodes: zipCodesInRadius.length,
          propertiesFound: allProperties.length,
          currentZip: zipLocation.zipCode,
          message: `Found ${properties.length} properties in ${zipLocation.zipCode}`
        })

      } catch (error) {
        console.error(`Error searching ${zipLocation.zipCode}:`, error)
        zipCodesSearched++
      }
    }

    // Sort properties by distance from center
    allProperties.sort((a, b) => (a.distance || 0) - (b.distance || 0))

    return {
      properties: allProperties,
      searchArea: {
        centerZip: centerZipCode,
        radiusMiles,
        zipCodesSearched: zipCodesInRadius.map(z => z.zipCode),
        totalZipCodes: zipCodesInRadius.length,
        propertiesFound: allProperties.length
      }
    }
  }
}
