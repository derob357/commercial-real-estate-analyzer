import MobileResponsiveDashboard from "@/components/MobileResponsiveDashboard"
import { InstitutionalDataDashboard } from "@/components/InstitutionalDataDashboard"

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
  noi?: number
  listingSource?: string
}

export default function Dashboard() {
  const [selectedZipCode, setSelectedZipCode] = useState<string>("")
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRadiusPrompt, setShowRadiusPrompt] = useState(false)
  const [isRadiusSearching, setIsRadiusSearching] = useState(false)
  const [radiusSearchProgress, setRadiusSearchProgress] = useState<any>(null)
  const [searchArea, setSearchArea] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'alerts' | 'portfolio'>('search')

  const handleZipCodeSearch = async (zipCode: string) => {
    setIsLoading(true)
    setSelectedZipCode(zipCode)
    setProperties([])
    setSearchArea(null)
    setShowRadiusPrompt(false)

    try {
      // Search for properties in the zip code
      const response = await fetch(`/api/properties/search?zip_code=${zipCode}`)
      if (response.ok) {
        const data = await response.json()
        const foundProperties = data.properties || []

        if (foundProperties.length === 0) {
          // No properties found, show radius search prompt
          setShowRadiusPrompt(true)
        } else {
          setProperties(foundProperties)
        }
      } else {
        // API error, show radius search prompt
        setShowRadiusPrompt(true)
      }
    } catch (error) {
      console.error("Error searching properties:", error)
      // Error occurred, show radius search prompt
      setShowRadiusPrompt(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRadiusSearch = async (radius: number) => {
    setIsRadiusSearching(true)
    setRadiusSearchProgress(null)

    try {
      const result = await RadiusSearchService.performRadiusSearch(
        selectedZipCode,
        radius,
        (progress) => {
          setRadiusSearchProgress(progress)
        }
      )

      setProperties(result.properties)
      setSearchArea(result.searchArea)
      setShowRadiusPrompt(false)
    } catch (error) {
      console.error("Radius search error:", error)
    } finally {
      setIsRadiusSearching(false)
      setRadiusSearchProgress(null)
    }
  }

  const handleCancelRadiusSearch = () => {
    setShowRadiusPrompt(false)
    setIsRadiusSearching(false)
    setRadiusSearchProgress(null)
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (rate: number | undefined) => {
    if (!rate) return "N/A"
    return `${(rate * 100).toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Commercial Real Estate Analyzer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  <span>Alerts</span>
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'portfolio' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Portfolio</span>
                </button>
              </nav>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Live Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Search and Properties */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Property Search</span>
                </CardTitle>
                <CardDescription>
                  Search for commercial properties by zip code to analyze investment opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ZipCodeSearch onZipCodeSelect={handleZipCodeSearch} />
              </CardContent>
            </Card>

            {/* Properties List */}
            {selectedZipCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Properties in {selectedZipCode}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
                      </Badge>
                      {searchArea && (
                        <Badge variant="outline" className="text-blue-600">
                          {searchArea.radiusMiles} mile radius
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : properties.length > 0 ? (
                    <div className="space-y-4">
                      {properties.map((property) => (
                        <div
                          key={property.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedProperty?.id === property.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedProperty(property)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {property.address}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {property.city}, {property.state} {property.zipCode}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge variant="outline">{property.propertyType}</Badge>
                                {property.units && (
                                  <span className="text-sm text-gray-600">
                                    {property.units} units
                                  </span>
                                )}
                                {property.sqft && (
                                  <span className="text-sm text-gray-600">
                                    {property.sqft.toLocaleString()} sq ft
                                  </span>
                                )}
                                {property.distance && (
                                  <Badge variant="secondary" className="text-xs">
                                    {property.distance.toFixed(1)} mi
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">
                                {formatCurrency(property.listingPrice)}
                              </div>
                              {property.capRate && (
                                <div className="text-sm text-gray-600">
                                  {formatPercentage(property.capRate)} Cap Rate
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !showRadiusPrompt ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No properties found in this zip code</p>
                      <p className="text-sm">Radius search prompt will appear to expand your search area</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Analysis Tools */}
          <div className="space-y-6">

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Market Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedZipCode ? (
                  <div className="space-y-4">
                    <MarketDataDashboard zipCode={selectedZipCode} />
                    <MarketDataCharts zipCode={selectedZipCode} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a zip code to view market data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Analysis */}
            {selectedProperty && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5" />
                    <span>Property Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Detailed financial analysis for selected property
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyAnalyzer property={selectedProperty} />
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {selectedProperty && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Analysis Tools</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      // Enhanced analysis is already integrated in PropertyAnalyzer
                    }}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Enhanced Analysis Available
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      // Tax assessor lookup is already integrated in PropertyAnalyzer
                    }}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Tax Assessor Integrated
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      // Market comparison is available in MarketDataCharts
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Market Analysis Ready
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Radius Search Prompt */}
        <RadiusSearchPrompt
          centerZipCode={selectedZipCode}
          showPrompt={showRadiusPrompt}
          onRadiusSelect={handleRadiusSearch}
          onCancel={handleCancelRadiusSearch}
          isSearching={isRadiusSearching}
          searchProgress={radiusSearchProgress}
        />
      )}

      {/* Property Alerts Tab */}
      {activeTab === 'alerts' && (
        <PropertyAlerts />
      )}

      {/* Portfolio Tracker Tab */}
      {activeTab === 'portfolio' && (
        <PortfolioTracker />
      )}
    </div>
  )
}
