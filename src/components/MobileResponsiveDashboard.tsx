"use client"

import { useState, useEffect } from "react"
import { Search, Building2, Calculator, TrendingUp, MapPin, DollarSign, Bell, BarChart3, Menu, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useUser, UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import ZipCodeSearch from "@/components/ZipCodeSearch"
import PropertyAnalyzer from "@/components/PropertyAnalyzer"
import MarketDataDashboard from "@/components/MarketDataDashboard"
import MarketDataCharts from "@/components/MarketDataCharts"
import RadiusSearchPrompt from "@/components/RadiusSearchPrompt"
import PropertyAlerts from "@/components/PropertyAlerts"
import PortfolioTracker from "@/components/PortfolioTracker"
import { RadiusSearchService } from "@/services/RadiusSearchService"
import { MLSDataService } from "@/services/MLSDataService"

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
  distance?: number
  mlsId?: string
  daysOnMarket?: number
  photos?: string[]
}

type ActiveTab = 'search' | 'alerts' | 'portfolio'

export default function MobileResponsiveDashboard() {
  const { user, isLoaded } = useUser()
  const [selectedZipCode, setSelectedZipCode] = useState<string>("")
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRadiusPrompt, setShowRadiusPrompt] = useState(false)
  const [isRadiusSearching, setIsRadiusSearching] = useState(false)
  const [radiusSearchProgress, setRadiusSearchProgress] = useState<any>(null)
  const [searchArea, setSearchArea] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('search')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mlsService] = useState(() => MLSDataService.getInstance())

  useEffect(() => {
    // Initialize MLS service
    mlsService.initialize()
  }, [mlsService])

  const handleZipCodeSearch = async (zipCode: string) => {
    setIsLoading(true)
    setSelectedZipCode(zipCode)
    setProperties([])
    setSearchArea(null)
    setShowRadiusPrompt(false)

    try {
      // Try MLS search first
      const mlsResults = await mlsService.searchProperties({
        location: {
          zipCodes: [zipCode]
        },
        listingStatus: ['Active']
      })

      if (mlsResults.length > 0) {
        const convertedProperties: Property[] = mlsResults.map(mlsProp => ({
          id: mlsProp.mlsId,
          address: mlsProp.address,
          city: mlsProp.city,
          state: mlsProp.state,
          zipCode: mlsProp.zipCode,
          propertyType: mlsProp.propertyType,
          units: mlsProp.units,
          sqft: mlsProp.sqft,
          listingPrice: mlsProp.listingPrice,
          capRate: mlsProp.financials?.capRate,
          noi: mlsProp.financials?.noi,
          listingSource: 'MLS',
          mlsId: mlsProp.mlsId,
          daysOnMarket: mlsProp.daysOnMarket,
          photos: mlsProp.photos
        }))
        setProperties(convertedProperties)
      } else {
        // Fallback to radius search prompt
        setShowRadiusPrompt(true)
      }
    } catch (error) {
      console.error("Error searching properties:", error)
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
      notation: window.innerWidth < 768 ? "compact" : "standard"
    }).format(amount)
  }

  const formatPercentage = (rate: number | undefined) => {
    if (!rate) return "N/A"
    return `${(rate * 100).toFixed(2)}%`
  }

  const NavigationMenu = () => (
    <nav className="flex flex-col space-y-2 p-4">
      <button
        onClick={() => {
          setActiveTab('search')
          setMobileMenuOpen(false)
        }}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
          activeTab === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Search className="h-5 w-5" />
        <div>
          <div className="font-medium">Property Search</div>
          <div className="text-sm opacity-75">Find investment opportunities</div>
        </div>
      </button>
      <button
        onClick={() => {
          setActiveTab('alerts')
          setMobileMenuOpen(false)
        }}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
          activeTab === 'alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Bell className="h-5 w-5" />
        <div>
          <div className="font-medium">Property Alerts</div>
          <div className="text-sm opacity-75">Monitor new listings</div>
        </div>
      </button>
      <button
        onClick={() => {
          setActiveTab('portfolio')
          setMobileMenuOpen(false)
        }}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
          activeTab === 'portfolio' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <BarChart3 className="h-5 w-5" />
        <div>
          <div className="font-medium">Portfolio</div>
          <div className="text-sm opacity-75">Track performance</div>
        </div>
      </button>
    </nav>
  )

  const PropertyCard = ({ property }: { property: Property }) => (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md active:scale-95 ${
        selectedProperty?.id === property.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedProperty(property)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Property Image */}
          {property.photos && property.photos.length > 0 && (
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={property.photos[0]}
                alt={property.address}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Property Info */}
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {property.address}
            </h3>
            <p className="text-sm text-gray-600">
              {property.city}, {property.state} {property.zipCode}
            </p>
          </div>

          {/* Property Details */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {property.propertyType}
            </Badge>
            {property.listingSource && (
              <Badge variant="secondary" className="text-xs">
                {property.listingSource}
              </Badge>
            )}
            {property.distance && (
              <Badge variant="secondary" className="text-xs">
                {property.distance.toFixed(1)} mi
              </Badge>
            )}
            {property.daysOnMarket && (
              <Badge variant="outline" className="text-xs">
                {property.daysOnMarket} days
              </Badge>
            )}
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-gray-500">List Price</p>
              <p className="font-semibold text-sm">{formatCurrency(property.listingPrice)}</p>
            </div>
            {property.capRate && (
              <div>
                <p className="text-xs text-gray-500">Cap Rate</p>
                <p className="font-semibold text-sm">{formatPercentage(property.capRate)}</p>
              </div>
            )}
          </div>

          {/* Additional Details */}
          {(property.units || property.sqft) && (
            <div className="flex justify-between text-xs text-gray-600 pt-1">
              {property.units && <span>{property.units} units</span>}
              {property.sqft && <span>{property.sqft.toLocaleString()} sq ft</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <span>RE Analyzer</span>
                  </SheetTitle>
                  <SheetDescription>
                    Commercial real estate investment platform
                  </SheetDescription>
                </SheetHeader>
                <NavigationMenu />
              </SheetContent>
            </Sheet>

            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="font-bold text-gray-900 text-lg md:text-xl">
                <span className="hidden sm:inline">Commercial Real Estate Analyzer</span>
                <span className="sm:hidden">RE Analyzer</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block border-t">
          <div className="flex items-center justify-center space-x-1 py-2">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'portfolio' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Portfolio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <SignedIn>
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Search className="h-5 w-5" />
                    <span>Property Search</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Search for commercial properties with MLS integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ZipCodeSearch onZipCodeSelect={handleZipCodeSearch} />
                </CardContent>
              </Card>

              {/* Properties Grid */}
              {selectedZipCode && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Properties in {selectedZipCode}
                    </h2>
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
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : properties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {properties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  ) : !showRadiusPrompt ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">No properties found in this zip code</p>
                        <p className="text-sm text-gray-500">Radius search prompt will appear to expand your search area</p>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )}

              {/* Property Analysis Panel */}
              {selectedProperty && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calculator className="h-5 w-5" />
                        <span>Property Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PropertyAnalyzer property={selectedProperty} />
                    </CardContent>
                  </Card>

                  {selectedZipCode && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5" />
                          <span>Market Data</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MarketDataDashboard zipCode={selectedZipCode} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Radius Search Prompt */}
              <RadiusSearchPrompt
                centerZipCode={selectedZipCode}
                showPrompt={showRadiusPrompt}
                onRadiusSelect={handleRadiusSearch}
                onCancel={handleCancelRadiusSearch}
                isSearching={isRadiusSearching}
                searchProgress={radiusSearchProgress}
              />
            </div>
          )}

          {activeTab === 'alerts' && <PropertyAlerts />}
          {activeTab === 'portfolio' && <PortfolioTracker />}
        </SignedIn>

        <SignedOut>
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span>Welcome to RE Analyzer</span>
              </CardTitle>
              <CardDescription>
                Professional commercial real estate investment platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Sign in to access property search, investment alerts, and portfolio tracking.
                </p>
                <SignInButton mode="modal">
                  <Button className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    Sign In to Get Started
                  </Button>
                </SignInButton>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• MLS-integrated property search</li>
                  <li>• Tax assessor data integration</li>
                  <li>• Automated investment alerts</li>
                  <li>• Portfolio performance tracking</li>
                  <li>• Market analytics & trends</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </SignedOut>
      </div>
    </div>
  )
}
