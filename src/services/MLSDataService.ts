interface MLSProperty {
  mlsId: string
  listingKey: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  propertySubType: string
  listingPrice: number
  originalListPrice: number
  priceChangeHistory: PriceChange[]
  sqft: number
  lotSize?: number
  yearBuilt?: number
  units?: number
  bedrooms?: number
  bathrooms?: number
  listingDate: Date
  lastModified: Date
  daysOnMarket: number
  listingStatus: 'Active' | 'Pending' | 'Sold' | 'Expired' | 'Withdrawn'
  listingAgent: {
    id: string
    name: string
    email?: string
    phone?: string
    brokerageName: string
  }
  photos: string[]
  description: string
  features: string[]
  financials?: {
    capRate?: number
    noi?: number
    grossIncome?: number
    operatingExpenses?: number
    taxes?: number
    insurance?: number
  }
  coordinates: {
    latitude: number
    longitude: number
  }
  mlsSource: string
  lastSyncDate: Date
}

interface PriceChange {
  previousPrice: number
  newPrice: number
  changeDate: Date
  changeAmount: number
  changePercent: number
}

interface MLSSearchCriteria {
  location: {
    zipCodes?: string[]
    cities?: string[]
    states?: string[]
    radius?: {
      centerLat: number
      centerLng: number
      radiusMiles: number
    }
  }
  propertyType?: string[]
  priceRange?: {
    min?: number
    max?: number
  }
  sqftRange?: {
    min?: number
    max?: number
  }
  listingStatus?: string[]
  listingDateRange?: {
    from?: Date
    to?: Date
  }
}

interface MLSDataFeed {
  id: string
  name: string
  region: string
  apiEndpoint: string
  isActive: boolean
  lastSync: Date
  totalProperties: number
  authConfig: {
    type: 'apiKey' | 'oauth' | 'rets'
    credentials: Record<string, string>
  }
}

// Major MLS systems across the southeastern US
const SE_MLS_FEEDS: MLSDataFeed[] = [
  {
    id: 'gamls',
    name: 'Georgia MLS',
    region: 'Georgia',
    apiEndpoint: 'https://api.gamls.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.GAMLS_USERNAME || '',
        password: process.env.GAMLS_PASSWORD || '',
        loginUrl: 'https://rets.gamls.com/login'
      }
    }
  },
  {
    id: 'first-multiple',
    name: 'First Multiple Listing Service',
    region: 'Alabama',
    apiEndpoint: 'https://api.firstmls.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.FIRST_MLS_USERNAME || '',
        password: process.env.FIRST_MLS_PASSWORD || '',
        loginUrl: 'https://rets.firstmls.com/login'
      }
    }
  },
  {
    id: 'charleston-trident',
    name: 'Charleston Trident MLS',
    region: 'South Carolina',
    apiEndpoint: 'https://api.ctarmls.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.CTAR_MLS_USERNAME || '',
        password: process.env.CTAR_MLS_PASSWORD || '',
        loginUrl: 'https://rets.ctarmls.com/login'
      }
    }
  },
  {
    id: 'northeast-florida',
    name: 'Northeast Florida MLS',
    region: 'Florida',
    apiEndpoint: 'https://api.nefmls.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.NEFMLS_USERNAME || '',
        password: process.env.NEFMLS_PASSWORD || '',
        loginUrl: 'https://rets.nefmls.com/login'
      }
    }
  },
  {
    id: 'rein',
    name: 'Real Estate Information Network (REIN)',
    region: 'Tennessee',
    apiEndpoint: 'https://api.rein.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.REIN_USERNAME || '',
        password: process.env.REIN_PASSWORD || '',
        loginUrl: 'https://rets.rein.com/login'
      }
    }
  },
  {
    id: 'canopy',
    name: 'Canopy MLS',
    region: 'North Carolina',
    apiEndpoint: 'https://api.canopymls.com/v1',
    isActive: true,
    lastSync: new Date(),
    totalProperties: 0,
    authConfig: {
      type: 'rets',
      credentials: {
        username: process.env.CANOPY_MLS_USERNAME || '',
        password: process.env.CANOPY_MLS_PASSWORD || '',
        loginUrl: 'https://rets.canopymls.com/login'
      }
    }
  }
]

export class MLSDataService {
  private static instance: MLSDataService
  private feeds: MLSDataFeed[] = SE_MLS_FEEDS
  private isInitialized = false

  static getInstance(): MLSDataService {
    if (!MLSDataService.instance) {
      MLSDataService.instance = new MLSDataService()
    }
    return MLSDataService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('Initializing MLS Data Service...')

    // Test connections to all active feeds
    for (const feed of this.feeds.filter(f => f.isActive)) {
      try {
        await this.testConnection(feed)
        console.log(`✅ Connected to ${feed.name}`)
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${feed.name}:`, error)
        feed.isActive = false
      }
    }

    this.isInitialized = true
  }

  private async testConnection(feed: MLSDataFeed): Promise<boolean> {
    // Simulate connection test - in production, this would make actual API calls
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve(true)
        } else {
          reject(new Error('Connection failed'))
        }
      }, 1000)
    })
  }

  async searchProperties(criteria: MLSSearchCriteria): Promise<MLSProperty[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const allProperties: MLSProperty[] = []
    const activeFeedsForRegion = this.getRelevantFeeds(criteria)

    // Search across relevant MLS feeds
    for (const feed of activeFeedsForRegion) {
      try {
        const properties = await this.searchInFeed(feed, criteria)
        allProperties.push(...properties)
      } catch (error) {
        console.error(`Error searching in ${feed.name}:`, error)
      }
    }

    // Deduplicate and sort results
    return this.deduplicateProperties(allProperties)
  }

  private getRelevantFeeds(criteria: MLSSearchCriteria): MLSDataFeed[] {
    const { location } = criteria

    if (!location) return this.feeds.filter(f => f.isActive)

    const relevantFeeds = this.feeds.filter(feed => {
      if (!feed.isActive) return false

      // Filter by state/region
      if (location.states?.length) {
        const feedStates = this.getFeedStates(feed)
        return location.states.some(state => feedStates.includes(state))
      }

      // Filter by cities
      if (location.cities?.length) {
        const feedCities = this.getFeedCities(feed)
        return location.cities.some(city =>
          feedCities.some(feedCity =>
            feedCity.toLowerCase().includes(city.toLowerCase())
          )
        )
      }

      return true
    })

    return relevantFeeds.length > 0 ? relevantFeeds : this.feeds.filter(f => f.isActive)
  }

  private getFeedStates(feed: MLSDataFeed): string[] {
    const stateMapping: { [key: string]: string[] } = {
      'gamls': ['GA'],
      'first-multiple': ['AL'],
      'charleston-trident': ['SC'],
      'northeast-florida': ['FL'],
      'rein': ['TN'],
      'canopy': ['NC']
    }
    return stateMapping[feed.id] || []
  }

  private getFeedCities(feed: MLSDataFeed): string[] {
    const cityMapping: { [key: string]: string[] } = {
      'gamls': ['Atlanta', 'Warner Robins', 'Forsyth', 'Savannah', 'Augusta', 'Columbus'],
      'first-multiple': ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
      'charleston-trident': ['Charleston', 'Columbia', 'Greenville'],
      'northeast-florida': ['Jacksonville'],
      'rein': ['Nashville', 'Memphis', 'Knoxville'],
      'canopy': ['Charlotte', 'Raleigh', 'Greensboro']
    }
    return cityMapping[feed.id] || []
  }

  private async searchInFeed(feed: MLSDataFeed, criteria: MLSSearchCriteria): Promise<MLSProperty[]> {
    // Simulate MLS API call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

    // Generate mock properties that match the criteria
    return this.generateMockProperties(feed, criteria)
  }

  private generateMockProperties(feed: MLSDataFeed, criteria: MLSSearchCriteria): MLSProperty[] {
    const properties: MLSProperty[] = []
    const propertyCount = Math.floor(Math.random() * 15) + 5 // 5-20 properties

    for (let i = 0; i < propertyCount; i++) {
      const property = this.createMockProperty(feed, criteria, i)
      properties.push(property)
    }

    return properties
  }

  private createMockProperty(feed: MLSDataFeed, criteria: MLSSearchCriteria, index: number): MLSProperty {
    const propertyTypes = criteria.propertyType || ['Apartment', 'Mixed Use', 'Retail', 'Office', 'Industrial']
    const selectedType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]

    const cities = this.getFeedCities(feed)
    const states = this.getFeedStates(feed)
    const selectedCity = cities[Math.floor(Math.random() * cities.length)]
    const selectedState = states[0]

    const listingPrice = (criteria.priceRange?.min || 500000) +
                        Math.floor(Math.random() * ((criteria.priceRange?.max || 5000000) - (criteria.priceRange?.min || 500000)))

    const sqft = (criteria.sqftRange?.min || 5000) +
                Math.floor(Math.random() * ((criteria.sqftRange?.max || 50000) - (criteria.sqftRange?.min || 5000)))

    const listingDate = new Date()
    listingDate.setDate(listingDate.getDate() - Math.floor(Math.random() * 90)) // 0-90 days ago

    const coordinates = this.getCoordinatesForCity(selectedCity, selectedState)

    return {
      mlsId: `${feed.id.toUpperCase()}-${Date.now()}-${index}`,
      listingKey: `LK${Date.now()}${index}`,
      address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Commerce', 'Business'][Math.floor(Math.random() * 5)]} Street`,
      city: selectedCity,
      state: selectedState,
      zipCode: this.getZipCodeForCity(selectedCity, selectedState),
      propertyType: selectedType,
      propertySubType: this.getSubType(selectedType),
      listingPrice,
      originalListPrice: listingPrice + Math.floor(Math.random() * 200000),
      priceChangeHistory: [],
      sqft,
      lotSize: selectedType === 'Land' ? sqft * 2 : undefined,
      yearBuilt: 1980 + Math.floor(Math.random() * 40),
      units: selectedType === 'Apartment' ? Math.floor(Math.random() * 50) + 5 : undefined,
      bedrooms: selectedType === 'Apartment' ? Math.floor(Math.random() * 3) + 1 : undefined,
      bathrooms: selectedType === 'Apartment' ? Math.floor(Math.random() * 2) + 1 : undefined,
      listingDate,
      lastModified: new Date(),
      daysOnMarket: Math.floor((Date.now() - listingDate.getTime()) / (1000 * 60 * 60 * 24)),
      listingStatus: 'Active',
      listingAgent: {
        id: `agent_${Math.floor(Math.random() * 1000)}`,
        name: this.generateAgentName(),
        email: `agent${Math.floor(Math.random() * 1000)}@${feed.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: this.generatePhoneNumber(),
        brokerageName: `${feed.name} Realty`
      },
      photos: this.generatePhotoUrls(3 + Math.floor(Math.random() * 5)),
      description: `Beautiful ${selectedType.toLowerCase()} property in ${selectedCity}. Great investment opportunity with excellent location and potential for growth.`,
      features: this.generateFeatures(selectedType),
      financials: {
        capRate: 0.04 + Math.random() * 0.06,
        noi: listingPrice * (0.04 + Math.random() * 0.06),
        grossIncome: listingPrice * (0.08 + Math.random() * 0.04),
        operatingExpenses: listingPrice * (0.02 + Math.random() * 0.02),
        taxes: listingPrice * 0.015,
        insurance: listingPrice * 0.005
      },
      coordinates,
      mlsSource: feed.name,
      lastSyncDate: new Date()
    }
  }

  private getSubType(propertyType: string): string {
    const subTypes: { [key: string]: string[] } = {
      'Apartment': ['Garden Style', 'High Rise', 'Mid Rise', 'Townhome Style'],
      'Mixed Use': ['Residential/Commercial', 'Office/Retail', 'Mixed Income'],
      'Retail': ['Strip Center', 'Shopping Center', 'Free Standing', 'Anchor Store'],
      'Office': ['Class A', 'Class B', 'Class C', 'Medical Office'],
      'Industrial': ['Warehouse', 'Manufacturing', 'Distribution', 'Flex Space']
    }
    const options = subTypes[propertyType] || ['General']
    return options[Math.floor(Math.random() * options.length)]
  }

  private getCoordinatesForCity(city: string, state: string): { latitude: number; longitude: number } {
    const coordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'Atlanta': { latitude: 33.7490, longitude: -84.3880 },
      'Warner Robins': { latitude: 32.6130, longitude: -83.6240 },
      'Forsyth': { latitude: 33.0343, longitude: -83.9382 },
      'Birmingham': { latitude: 33.5186, longitude: -86.8104 },
      'Charleston': { latitude: 32.7765, longitude: -79.9311 },
      'Jacksonville': { latitude: 30.3322, longitude: -81.6557 },
      'Nashville': { latitude: 36.1627, longitude: -86.7816 },
      'Charlotte': { latitude: 35.2271, longitude: -80.8431 }
    }

    const baseCoords = coordinates[city] || { latitude: 33.0, longitude: -84.0 }

    // Add small random offset for property-specific coordinates
    return {
      latitude: baseCoords.latitude + (Math.random() - 0.5) * 0.1,
      longitude: baseCoords.longitude + (Math.random() - 0.5) * 0.1
    }
  }

  private getZipCodeForCity(city: string, state: string): string {
    const zipCodes: { [key: string]: string[] } = {
      'Atlanta': ['30301', '30302', '30309', '30313'],
      'Warner Robins': ['31088', '31093', '31095'],
      'Forsyth': ['31029'],
      'Birmingham': ['35203', '35205', '35209'],
      'Charleston': ['29401', '29403', '29407'],
      'Jacksonville': ['32202', '32204', '32207'],
      'Nashville': ['37201', '37203', '37205'],
      'Charlotte': ['28202', '28204', '28205']
    }

    const cityZips = zipCodes[city] || ['30301']
    return cityZips[Math.floor(Math.random() * cityZips.length)]
  }

  private generateAgentName(): string {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
  }

  private generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100
    const exchange = Math.floor(Math.random() * 900) + 100
    const number = Math.floor(Math.random() * 9000) + 1000
    return `(${areaCode}) ${exchange}-${number}`
  }

  private generatePhotoUrls(count: number): string[] {
    const photos: string[] = []
    for (let i = 0; i < count; i++) {
      photos.push(`https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=800&h=600&fit=crop`)
    }
    return photos
  }

  private generateFeatures(propertyType: string): string[] {
    const commonFeatures = ['Parking Available', 'Professional Management', 'Prime Location']
    const typeFeatures: { [key: string]: string[] } = {
      'Apartment': ['In-Unit Laundry', 'Balcony/Patio', 'Pool', 'Fitness Center'],
      'Retail': ['High Traffic Location', 'Storefront Signage', 'Customer Parking'],
      'Office': ['Conference Rooms', 'Reception Area', 'High-Speed Internet'],
      'Industrial': ['Loading Docks', 'High Ceilings', 'Overhead Doors']
    }

    const features = [...commonFeatures]
    const specificFeatures = typeFeatures[propertyType] || []
    features.push(...specificFeatures.slice(0, 2 + Math.floor(Math.random() * 2)))

    return features
  }

  private deduplicateProperties(properties: MLSProperty[]): MLSProperty[] {
    const seen = new Set<string>()
    const unique: MLSProperty[] = []

    for (const property of properties) {
      const key = `${property.address}-${property.city}-${property.state}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(property)
      }
    }

    return unique.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  }

  async getPropertyDetails(mlsId: string): Promise<MLSProperty | null> {
    // Simulate fetching detailed property information
    return new Promise((resolve) => {
      setTimeout(() => {
        // In production, this would fetch from the specific MLS API
        resolve(null) // Placeholder
      }, 1000)
    })
  }

  async subscribeToUpdates(criteria: MLSSearchCriteria, callback: (properties: MLSProperty[]) => void): Promise<string> {
    // Simulate real-time updates subscription
    const subscriptionId = `sub_${Date.now()}_${Math.random()}`

    // Simulate periodic updates
    const interval = setInterval(async () => {
      try {
        const updates = await this.searchProperties(criteria)
        if (updates.length > 0) {
          callback(updates)
        }
      } catch (error) {
        console.error('Error in MLS subscription:', error)
      }
    }, 300000) // Check every 5 minutes

    // Store interval for cleanup
    this.subscriptions.set(subscriptionId, interval)

    return subscriptionId
  }

  private subscriptions = new Map<string, NodeJS.Timeout>()

  unsubscribeFromUpdates(subscriptionId: string): void {
    const interval = this.subscriptions.get(subscriptionId)
    if (interval) {
      clearInterval(interval)
      this.subscriptions.delete(subscriptionId)
    }
  }

  getActiveFeeds(): MLSDataFeed[] {
    return this.feeds.filter(f => f.isActive)
  }

  async syncAllFeeds(): Promise<void> {
    console.log('Starting full MLS sync...')

    for (const feed of this.feeds.filter(f => f.isActive)) {
      try {
        console.log(`Syncing ${feed.name}...`)
        // In production, this would perform full data sync
        feed.lastSync = new Date()
        console.log(`✅ Synced ${feed.name}`)
      } catch (error) {
        console.error(`❌ Failed to sync ${feed.name}:`, error)
      }
    }

    console.log('MLS sync completed')
  }
}
