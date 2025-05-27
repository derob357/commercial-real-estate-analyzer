'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Search, MapPin, Building, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface Property {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  price: number
  squareFeet: number
  units: number
  yearBuilt: number
  capRate: number
  noi: number
  pricePerUnit: number
  pricePerSqFt: number
  grossRentMultiplier: number
  lastSaleDate?: string
  taxAssessedValue?: number
  taxPayments?: {
    year: number
    amount: number
  }[]
}

export default function PropertySearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [minUnits, setMinUnits] = useState('')
  const [maxUnits, setMaxUnits] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a zip code or city')
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      // Simulate API call - replace with actual backend integration
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock property data for demonstration
      const mockProperties: Property[] = [
        {
          id: '1',
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          propertyType: 'Apartment',
          price: 2850000,
          squareFeet: 8500,
          units: 12,
          yearBuilt: 1985,
          capRate: 4.8,
          noi: 136800,
          pricePerUnit: 237500,
          pricePerSqFt: 335,
          grossRentMultiplier: 12.5,
          lastSaleDate: '2022-03-15',
          taxAssessedValue: 2100000,
          taxPayments: [
            { year: 2023, amount: 31500 },
            { year: 2022, amount: 29800 },
            { year: 2021, amount: 28200 }
          ]
        },
        {
          id: '2',
          address: '456 Oak Avenue',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          propertyType: 'Mixed Use',
          price: 4200000,
          squareFeet: 15200,
          units: 18,
          yearBuilt: 1992,
          capRate: 5.2,
          noi: 218400,
          pricePerUnit: 233333,
          pricePerSqFt: 276,
          grossRentMultiplier: 11.8,
          lastSaleDate: '2023-01-20',
          taxAssessedValue: 3800000,
          taxPayments: [
            { year: 2023, amount: 57000 },
            { year: 2022, amount: 54300 },
            { year: 2021, amount: 51600 }
          ]
        }
      ]

      setProperties(mockProperties)
      toast.success(`Found ${mockProperties.length} properties`)
    } catch (error) {
      toast.error('Failed to search properties')
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Property Search
          </CardTitle>
          <CardDescription>
            Search for commercial multi-family properties by location and criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter ZIP code, city, or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <Separator />

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Type</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="mixed-use">Mixed Use</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Min Price</label>
              <Input
                placeholder="$1,000,000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Max Price</label>
              <Input
                placeholder="$10,000,000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Units Range</label>
              <div className="flex gap-1">
                <Input
                  placeholder="Min"
                  value={minUnits}
                  onChange={(e) => setMinUnits(e.target.value)}
                  className="w-20"
                />
                <span className="text-gray-500 self-center">-</span>
                <Input
                  placeholder="Max"
                  value={maxUnits}
                  onChange={(e) => setMaxUnits(e.target.value)}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results ({formatNumber(properties.length)} properties)
            </h2>
            {properties.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Sort by Price</Button>
                <Button variant="outline" size="sm">Sort by Cap Rate</Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Searching properties...</p>
            </div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">No properties found matching your criteria</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Property Details */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-1">{property.address}</h3>
                            <div className="flex items-center text-gray-600 mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {property.city}, {property.state} {property.zipCode}
                            </div>
                            <div className="flex gap-2 mb-3">
                              <Badge variant="secondary">{property.propertyType}</Badge>
                              <Badge variant="outline">{property.units} Units</Badge>
                              <Badge variant="outline">{formatNumber(property.squareFeet)} sq ft</Badge>
                              <Badge variant="outline">Built {property.yearBuilt}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(property.price)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatCurrency(property.pricePerUnit)}/unit
                            </div>
                            <div className="text-sm text-gray-600">
                              ${property.pricePerSqFt}/sq ft
                            </div>
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Cap Rate</div>
                            <div className="text-lg font-semibold text-blue-600">
                              {property.capRate}%
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">NOI</div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(property.noi)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">GRM</div>
                            <div className="text-lg font-semibold">
                              {property.grossRentMultiplier}x
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Tax Assessed</div>
                            <div className="text-lg font-semibold">
                              {property.taxAssessedValue ? formatCurrency(property.taxAssessedValue) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Button className="w-full" size="lg">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Analyze Deal
                        </Button>
                        <Button variant="outline" className="w-full">
                          <Building className="h-4 w-4 mr-2" />
                          View Tax History
                        </Button>
                        <Button variant="outline" className="w-full">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Compare Properties
                        </Button>
                        
                        {property.lastSaleDate && (
                          <div className="text-sm text-gray-600 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Last sold: {new Date(property.lastSaleDate).toLocaleDateString()}
                          </div>
                        )}

                        {property.taxPayments && property.taxPayments.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium mb-1">Recent Tax Payments:</div>
                            {property.taxPayments.slice(0, 2).map((payment) => (
                              <div key={payment.year} className="flex justify-between text-gray-600">
                                <span>{payment.year}:</span>
                                <span>{formatCurrency(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}