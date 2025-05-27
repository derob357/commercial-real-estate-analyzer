'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plus, X, TrendingUp, Building } from 'lucide-react'
import { toast } from 'sonner'

interface Property {
  id: string
  name: string
  address: string
  purchasePrice: number
  capRate: number
  cashOnCash: number
  monthlyRent: number
  units: number
  yearBuilt: number
  squareFeet: number
  pricePerUnit: number
  pricePerSqFt: number
  noi: number
  monthlyCashFlow: number
  dscr: number
  grm: number
}

const mockProperties: Property[] = [
  {
    id: '1',
    name: 'Sunset Apartments',
    address: '123 Main St, Los Angeles, CA',
    purchasePrice: 2850000,
    capRate: 4.8,
    cashOnCash: 7.2,
    monthlyRent: 18500,
    units: 12,
    yearBuilt: 1985,
    squareFeet: 8500,
    pricePerUnit: 237500,
    pricePerSqFt: 335,
    noi: 136800,
    monthlyCashFlow: 4250,
    dscr: 1.32,
    grm: 12.5
  },
  {
    id: '2',
    name: 'Oak Plaza',
    address: '456 Oak Ave, Los Angeles, CA',
    purchasePrice: 4200000,
    capRate: 5.2,
    cashOnCash: 8.1,
    monthlyRent: 28000,
    units: 18,
    yearBuilt: 1992,
    squareFeet: 15200,
    pricePerUnit: 233333,
    pricePerSqFt: 276,
    noi: 218400,
    monthlyCashFlow: 6800,
    dscr: 1.45,
    grm: 11.8
  },
  {
    id: '3',
    name: 'Pine Valley Complex',
    address: '789 Pine St, Beverly Hills, CA',
    purchasePrice: 5600000,
    capRate: 4.5,
    cashOnCash: 6.8,
    monthlyRent: 35000,
    units: 24,
    yearBuilt: 2005,
    squareFeet: 22000,
    pricePerUnit: 233333,
    pricePerSqFt: 255,
    noi: 252000,
    monthlyCashFlow: 5200,
    dscr: 1.28,
    grm: 13.2
  }
]

export default function DealComparison() {
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([mockProperties[0], mockProperties[1]])
  const [availableProperties] = useState<Property[]>(mockProperties)

  const addProperty = (propertyId: string) => {
    const property = availableProperties.find(p => p.id === propertyId)
    if (property && !selectedProperties.find(p => p.id === propertyId)) {
      if (selectedProperties.length < 4) {
        setSelectedProperties([...selectedProperties, property])
        toast.success(`${property.name} added to comparison`)
      } else {
        toast.error('Maximum 4 properties can be compared')
      }
    }
  }

  const removeProperty = (propertyId: string) => {
    setSelectedProperties(selectedProperties.filter(p => p.id !== propertyId))
    toast.success('Property removed from comparison')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`
  }

  const getBestValue = (properties: Property[], key: keyof Property, higher = true) => {
    if (properties.length === 0) return null
    const values = properties.map(p => p[key] as number)
    const bestValue = higher ? Math.max(...values) : Math.min(...values)
    return bestValue
  }

  const isHighlight = (property: Property, key: keyof Property, higher = true) => {
    const bestValue = getBestValue(selectedProperties, key, higher)
    return bestValue === property[key]
  }

  // Chart data for comparison
  const chartData = selectedProperties.map(property => ({
    name: property.name.split(' ')[0], // Short name for chart
    capRate: property.capRate,
    cashOnCash: property.cashOnCash,
    pricePerUnit: property.pricePerUnit / 1000, // Convert to thousands
    dscr: property.dscr
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Deal Comparison</h1>
          <p className="text-gray-600">Side-by-side analysis of investment opportunities</p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={addProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Add property..." />
            </SelectTrigger>
            <SelectContent>
              {availableProperties
                .filter(p => !selectedProperties.find(sp => sp.id === p.id))
                .map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedProperties.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Properties Selected</h3>
            <p className="text-gray-500 mb-4">Add properties to start comparing deals</p>
            <Button onClick={() => setSelectedProperties([mockProperties[0], mockProperties[1]])}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sample Properties
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Property Cards Grid */}
          <div className={`grid gap-6 ${
            selectedProperties.length === 1 ? 'grid-cols-1' :
            selectedProperties.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            {selectedProperties.map((property) => (
              <Card key={property.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="text-sm">{property.address}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProperty(property.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center pb-4 border-b">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(property.purchasePrice)}
                    </div>
                    <div className="text-sm text-gray-600">Purchase Price</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cap Rate:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isHighlight(property, 'capRate', true) ? 'text-green-600' : ''}`}>
                          {formatPercent(property.capRate)}
                        </span>
                        {isHighlight(property, 'capRate', true) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cash on Cash:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isHighlight(property, 'cashOnCash', true) ? 'text-green-600' : ''}`}>
                          {formatPercent(property.cashOnCash)}
                        </span>
                        {isHighlight(property, 'cashOnCash', true) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">DSCR:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isHighlight(property, 'dscr', true) ? 'text-green-600' : ''}`}>
                          {property.dscr.toFixed(2)}x
                        </span>
                        {isHighlight(property, 'dscr', true) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Cash Flow:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isHighlight(property, 'monthlyCashFlow', true) ? 'text-green-600' : ''}`}>
                          {formatCurrency(property.monthlyCashFlow)}
                        </span>
                        {isHighlight(property, 'monthlyCashFlow', true) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Units:</span>
                        <span>{property.units}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Year Built:</span>
                        <span>{property.yearBuilt}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Price/Unit:</span>
                        <div className="flex items-center gap-2">
                          <span className={isHighlight(property, 'pricePerUnit', false) ? 'text-green-600 font-semibold' : ''}>
                            {formatCurrency(property.pricePerUnit)}
                          </span>
                          {isHighlight(property, 'pricePerUnit', false) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Price/SqFt:</span>
                        <div className="flex items-center gap-2">
                          <span className={isHighlight(property, 'pricePerSqFt', false) ? 'text-green-600 font-semibold' : ''}>
                            ${property.pricePerSqFt}
                          </span>
                          {isHighlight(property, 'pricePerSqFt', false) && <Badge variant="outline" className="text-green-600 text-xs">Best</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Detailed Analysis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Charts */}
          {selectedProperties.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Return Metrics Comparison</CardTitle>
                  <CardDescription>Cap Rate vs Cash-on-Cash Return</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'pricePerUnit') return [`$${Number(value)}k`, 'Price per Unit']
                        return [`${Number(value).toFixed(1)}%`, name === 'capRate' ? 'Cap Rate' : 'Cash on Cash']
                      }} />
                      <Legend />
                      <Bar dataKey="capRate" fill="#8884d8" name="Cap Rate %" />
                      <Bar dataKey="cashOnCash" fill="#82ca9d" name="Cash on Cash %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Value Metrics Comparison</CardTitle>
                  <CardDescription>Price per Unit vs DSCR</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'pricePerUnit') return [`$${Number(value)}k`, 'Price per Unit (thousands)']
                        return [Number(value).toFixed(2), 'DSCR']
                      }} />
                      <Legend />
                      <Bar dataKey="pricePerUnit" fill="#ffc658" name="Price per Unit ($k)" />
                      <Bar dataKey="dscr" fill="#ff7300" name="DSCR" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary Comparison Table */}
          {selectedProperties.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Comparison</CardTitle>
                <CardDescription>Key metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Metric</th>
                        {selectedProperties.map(property => (
                          <th key={property.id} className="text-center p-2 min-w-[120px]">
                            {property.name.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      <tr className="border-b">
                        <td className="p-2 font-medium">Purchase Price</td>
                        {selectedProperties.map(property => (
                          <td key={property.id} className="text-center p-2">
                            {formatCurrency(property.purchasePrice)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Cap Rate</td>
                        {selectedProperties.map(property => (
                          <td key={property.id} className={`text-center p-2 ${isHighlight(property, 'capRate', true) ? 'bg-green-50 font-semibold text-green-700' : ''}`}>
                            {formatPercent(property.capRate)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Cash on Cash</td>
                        {selectedProperties.map(property => (
                          <td key={property.id} className={`text-center p-2 ${isHighlight(property, 'cashOnCash', true) ? 'bg-green-50 font-semibold text-green-700' : ''}`}>
                            {formatPercent(property.cashOnCash)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Monthly Cash Flow</td>
                        {selectedProperties.map(property => (
                          <td key={property.id} className={`text-center p-2 ${isHighlight(property, 'monthlyCashFlow', true) ? 'bg-green-50 font-semibold text-green-700' : ''}`}>
                            {formatCurrency(property.monthlyCashFlow)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">DSCR</td>
                        {selectedProperties.map(property => (
                          <td key={property.id} className={`text-center p-2 ${isHighlight(property, 'dscr', true) ? 'bg-green-50 font-semibold text-green-700' : ''}`}>
                            {property.dscr.toFixed(2)}x
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  * Green highlights indicate the best value for each metric
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}