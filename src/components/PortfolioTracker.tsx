"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, PieChart, BarChart3, Plus, Eye, Calculator, DollarSign, Building2, MapPin, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts'

interface PortfolioProperty {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  purchaseDate: Date
  purchasePrice: number
  currentValue: number
  initialCapRate: number
  currentCapRate: number
  units?: number
  sqft: number
  grossIncome: number
  expenses: number
  noi: number
  cashFlow: number
  totalReturn: number
  equityInvested: number
  loanAmount?: number
  notes?: string
}

interface PerformanceMetrics {
  totalValue: number
  totalEquity: number
  totalCashFlow: number
  avgCapRate: number
  totalReturn: number
  portfolioIRR: number
  equityMultiple: number
}

interface ChartData {
  month: string
  portfolioValue: number
  cashFlow: number
  noi: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const SE_CITIES = [
  { value: "atlanta-ga", label: "Atlanta, GA" },
  { value: "warner-robins-ga", label: "Warner Robins, GA" },
  { value: "forsyth-ga", label: "Forsyth, GA" },
  { value: "savannah-ga", label: "Savannah, GA" },
  { value: "augusta-ga", label: "Augusta, GA" },
  { value: "columbus-ga", label: "Columbus, GA" },
  { value: "birmingham-al", label: "Birmingham, AL" },
  { value: "montgomery-al", label: "Montgomery, AL" },
  { value: "mobile-al", label: "Mobile, AL" },
  { value: "charleston-sc", label: "Charleston, SC" },
  { value: "columbia-sc", label: "Columbia, SC" },
  { value: "jacksonville-fl", label: "Jacksonville, FL" },
  { value: "tampa-fl", label: "Tampa, FL" },
  { value: "orlando-fl", label: "Orlando, FL" },
  { value: "nashville-tn", label: "Nashville, TN" },
  { value: "memphis-tn", label: "Memphis, TN" },
  { value: "charlotte-nc", label: "Charlotte, NC" },
  { value: "raleigh-nc", label: "Raleigh, NC" }
]

const PROPERTY_TYPES = [
  "Apartment", "Mixed Use", "Retail", "Office", "Industrial", "Self Storage", "Hotel", "Land"
]

export default function PortfolioTracker() {
  const [properties, setProperties] = useState<PortfolioProperty[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PortfolioProperty | null>(null)
  const [newProperty, setNewProperty] = useState<Partial<PortfolioProperty>>({
    propertyType: "Apartment",
    purchaseDate: new Date(),
    currentValue: 0,
    purchasePrice: 0,
    equityInvested: 0
  })

  useEffect(() => {
    loadPortfolioData()
    // Generate sample data if empty
    const saved = localStorage.getItem('portfolioProperties')
    if (!saved || JSON.parse(saved).length === 0) {
      generateSampleData()
    }
  }, [])

  const loadPortfolioData = () => {
    try {
      const saved = localStorage.getItem('portfolioProperties')
      if (saved) {
        const parsed = JSON.parse(saved).map((p: any) => ({
          ...p,
          purchaseDate: new Date(p.purchaseDate)
        }))
        setProperties(parsed)
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error)
    }
  }

  const savePortfolioData = (newProperties: PortfolioProperty[]) => {
    localStorage.setItem('portfolioProperties', JSON.stringify(newProperties))
    setProperties(newProperties)
  }

  const generateSampleData = () => {
    const sampleProperties: PortfolioProperty[] = [
      {
        id: 'prop_1',
        name: 'Peachtree Apartments',
        address: '1234 Peachtree St',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30309',
        propertyType: 'Apartment',
        purchaseDate: new Date('2022-06-15'),
        purchasePrice: 2800000,
        currentValue: 3200000,
        initialCapRate: 0.054,
        currentCapRate: 0.058,
        units: 24,
        sqft: 18000,
        grossIncome: 432000,
        expenses: 156000,
        noi: 276000,
        cashFlow: 84000,
        totalReturn: 0.28,
        equityInvested: 840000,
        loanAmount: 1960000
      },
      {
        id: 'prop_2',
        name: 'Warner Robins Shopping Center',
        address: '5678 Watson Blvd',
        city: 'Warner Robins',
        state: 'GA',
        zipCode: '31088',
        propertyType: 'Retail',
        purchaseDate: new Date('2021-03-20'),
        purchasePrice: 1500000,
        currentValue: 1750000,
        initialCapRate: 0.067,
        currentCapRate: 0.071,
        sqft: 12500,
        grossIncome: 180000,
        expenses: 54000,
        noi: 126000,
        cashFlow: 48000,
        totalReturn: 0.42,
        equityInvested: 450000,
        loanAmount: 1050000
      },
      {
        id: 'prop_3',
        name: 'Forsyth Industrial Park',
        address: '910 Industrial Dr',
        city: 'Forsyth',
        state: 'GA',
        zipCode: '31029',
        propertyType: 'Industrial',
        purchaseDate: new Date('2023-01-10'),
        purchasePrice: 950000,
        currentValue: 1100000,
        initialCapRate: 0.073,
        currentCapRate: 0.075,
        sqft: 25000,
        grossIncome: 96000,
        expenses: 24000,
        noi: 72000,
        cashFlow: 36000,
        totalReturn: 0.24,
        equityInvested: 285000,
        loanAmount: 665000
      }
    ]

    savePortfolioData(sampleProperties)
  }

  const addProperty = () => {
    if (!newProperty.name || !newProperty.purchasePrice || !newProperty.equityInvested) return

    const property: PortfolioProperty = {
      id: `prop_${Date.now()}`,
      name: newProperty.name,
      address: newProperty.address || '',
      city: newProperty.city || '',
      state: newProperty.state || '',
      zipCode: newProperty.zipCode || '',
      propertyType: newProperty.propertyType || 'Apartment',
      purchaseDate: newProperty.purchaseDate || new Date(),
      purchasePrice: newProperty.purchasePrice,
      currentValue: newProperty.currentValue || newProperty.purchasePrice,
      initialCapRate: newProperty.initialCapRate || 0,
      currentCapRate: newProperty.currentCapRate || newProperty.initialCapRate || 0,
      units: newProperty.units,
      sqft: newProperty.sqft || 0,
      grossIncome: newProperty.grossIncome || 0,
      expenses: newProperty.expenses || 0,
      noi: (newProperty.grossIncome || 0) - (newProperty.expenses || 0),
      cashFlow: newProperty.cashFlow || 0,
      totalReturn: 0,
      equityInvested: newProperty.equityInvested,
      loanAmount: newProperty.loanAmount
    }

    const updated = [...properties, property]
    savePortfolioData(updated)
    setShowAddDialog(false)
    setNewProperty({
      propertyType: "Apartment",
      purchaseDate: new Date(),
      currentValue: 0,
      purchasePrice: 0,
      equityInvested: 0
    })
  }

  const calculateMetrics = (): PerformanceMetrics => {
    if (properties.length === 0) {
      return {
        totalValue: 0,
        totalEquity: 0,
        totalCashFlow: 0,
        avgCapRate: 0,
        totalReturn: 0,
        portfolioIRR: 0,
        equityMultiple: 0
      }
    }

    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0)
    const totalEquityInvested = properties.reduce((sum, p) => sum + p.equityInvested, 0)
    const totalDebt = properties.reduce((sum, p) => sum + (p.loanAmount || 0), 0)
    const totalEquity = totalValue - totalDebt
    const totalCashFlow = properties.reduce((sum, p) => sum + p.cashFlow, 0)
    const totalNOI = properties.reduce((sum, p) => sum + p.noi, 0)
    const avgCapRate = totalValue > 0 ? totalNOI / totalValue : 0
    const totalReturn = totalEquityInvested > 0 ? (totalEquity - totalEquityInvested) / totalEquityInvested : 0
    const equityMultiple = totalEquityInvested > 0 ? totalEquity / totalEquityInvested : 0

    // Simplified IRR calculation (would be more complex in reality)
    const avgHoldPeriod = properties.reduce((sum, p) => {
      const years = (Date.now() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      return sum + years
    }, 0) / properties.length

    const portfolioIRR = avgHoldPeriod > 0 ? Math.pow(equityMultiple, 1/avgHoldPeriod) - 1 : 0

    return {
      totalValue,
      totalEquity,
      totalCashFlow,
      avgCapRate,
      totalReturn,
      portfolioIRR,
      equityMultiple
    }
  }

  const generateChartData = (): ChartData[] => {
    // Generate 12 months of data
    const data: ChartData[] = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      // Simulate growth over time
      const growthFactor = 1 + (11 - i) * 0.01 // 1% growth per month
      const portfolioValue = properties.reduce((sum, p) => sum + p.currentValue, 0) * (0.9 + growthFactor * 0.1)
      const cashFlow = properties.reduce((sum, p) => sum + p.cashFlow, 0) * (0.95 + growthFactor * 0.05)
      const noi = properties.reduce((sum, p) => sum + p.noi, 0) * (0.9 + growthFactor * 0.1)

      data.push({
        month: monthName,
        portfolioValue: Math.round(portfolioValue),
        cashFlow: Math.round(cashFlow),
        noi: Math.round(noi)
      })
    }

    return data
  }

  const getPropertyTypeDistribution = () => {
    const distribution: { [key: string]: number } = {}
    properties.forEach(p => {
      distribution[p.propertyType] = (distribution[p.propertyType] || 0) + p.currentValue
    })

    return Object.entries(distribution).map(([type, value], index) => ({
      name: type,
      value,
      color: COLORS[index % COLORS.length]
    }))
  }

  const metrics = calculateMetrics()
  const chartData = generateChartData()
  const propertyTypeData = getPropertyTypeDistribution()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <span>Portfolio Tracker</span>
          </h2>
          <p className="text-gray-600">Monitor your commercial real estate investments across the Southeast</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Property to Portfolio</DialogTitle>
              <DialogDescription>
                Enter your property details to track performance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Name</Label>
                  <Input
                    placeholder="e.g., Peachtree Apartments"
                    value={newProperty.name || ""}
                    onChange={(e) => setNewProperty({...newProperty, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={newProperty.propertyType || ""}
                    onValueChange={(value) => setNewProperty({...newProperty, propertyType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Property address"
                  value={newProperty.address || ""}
                  onChange={(e) => setNewProperty({...newProperty, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={newProperty.city || ""}
                    onChange={(e) => setNewProperty({...newProperty, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={newProperty.state || ""}
                    onChange={(e) => setNewProperty({...newProperty, state: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    placeholder="Zip"
                    value={newProperty.zipCode || ""}
                    onChange={(e) => setNewProperty({...newProperty, zipCode: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input
                    type="number"
                    placeholder="Purchase price"
                    value={newProperty.purchasePrice || ""}
                    onChange={(e) => setNewProperty({...newProperty, purchasePrice: Number(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    placeholder="Current value"
                    value={newProperty.currentValue || ""}
                    onChange={(e) => setNewProperty({...newProperty, currentValue: Number(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Equity Invested</Label>
                  <Input
                    type="number"
                    placeholder="Down payment + improvements"
                    value={newProperty.equityInvested || ""}
                    onChange={(e) => setNewProperty({...newProperty, equityInvested: Number(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loan Amount</Label>
                  <Input
                    type="number"
                    placeholder="Outstanding loan balance"
                    value={newProperty.loanAmount || ""}
                    onChange={(e) => setNewProperty({...newProperty, loanAmount: Number(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Annual Income</Label>
                  <Input
                    type="number"
                    placeholder="Gross income"
                    value={newProperty.grossIncome || ""}
                    onChange={(e) => setNewProperty({...newProperty, grossIncome: Number(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Expenses</Label>
                  <Input
                    type="number"
                    placeholder="Operating expenses"
                    value={newProperty.expenses || ""}
                    onChange={(e) => setNewProperty({...newProperty, expenses: Number(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Cash Flow</Label>
                  <Input
                    type="number"
                    placeholder="Net cash flow"
                    value={newProperty.cashFlow || ""}
                    onChange={(e) => setNewProperty({...newProperty, cashFlow: Number(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addProperty}>
                  Add Property
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Portfolio Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center space-x-1 mt-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">+{formatPercentage(metrics.totalReturn)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalEquity)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {formatPercentage(metrics.totalEquity / metrics.totalValue)} of portfolio
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annual Cash Flow</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalCashFlow)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {formatPercentage(metrics.avgCapRate)} avg cap rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portfolio IRR</p>
                <p className="text-2xl font-bold">{formatPercentage(metrics.portfolioIRR)}</p>
              </div>
              <Calculator className="h-8 w-8 text-orange-600" />
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {metrics.equityMultiple.toFixed(2)}x equity multiple
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Portfolio Value Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Value Trend</CardTitle>
                <CardDescription>12-month portfolio performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="portfolioValue" stroke="#8884d8" strokeWidth={2} name="Portfolio Value" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Property Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Portfolio distribution by property type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <PieChart
                      data={propertyTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {propertyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </PieChart>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow & NOI Trends</CardTitle>
              <CardDescription>Monthly income performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="noi" fill="#8884d8" name="NOI" />
                  <Bar dataKey="cashFlow" fill="#82ca9d" name="Cash Flow" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          {properties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Added</h3>
                <p className="text-gray-600 mb-4">Start building your portfolio by adding your first property</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {properties.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                          <Badge variant="outline">{property.propertyType}</Badge>
                        </div>

                        <div className="flex items-center space-x-1 text-gray-600 mb-3">
                          <MapPin className="h-4 w-4" />
                          <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Purchase Price</p>
                            <p className="font-medium">{formatCurrency(property.purchasePrice)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Current Value</p>
                            <p className="font-medium">{formatCurrency(property.currentValue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cap Rate</p>
                            <p className="font-medium">{formatPercentage(property.currentCapRate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cash Flow</p>
                            <p className="font-medium">{formatCurrency(property.cashFlow)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Purchased: {property.purchaseDate.toLocaleDateString()}</span>
                          </div>
                          {property.units && (
                            <span>{property.units} units</span>
                          )}
                          <span>{property.sqft.toLocaleString()} sq ft</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-2">
                          {property.currentValue > property.purchasePrice ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`font-medium ${
                            property.currentValue > property.purchasePrice ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage((property.currentValue - property.purchasePrice) / property.purchasePrice)}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedProperty(property)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Return Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Return</span>
                  <span className="font-medium">{formatPercentage(metrics.totalReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Portfolio IRR</span>
                  <span className="font-medium">{formatPercentage(metrics.portfolioIRR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Equity Multiple</span>
                  <span className="font-medium">{metrics.equityMultiple.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Cap Rate</span>
                  <span className="font-medium">{formatPercentage(metrics.avgCapRate)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Properties</span>
                  <span className="font-medium">{properties.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Square Feet</span>
                  <span className="font-medium">{properties.reduce((sum, p) => sum + p.sqft, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Units</span>
                  <span className="font-medium">{properties.reduce((sum, p) => sum + (p.units || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Property Value</span>
                  <span className="font-medium">
                    {formatCurrency(properties.length > 0 ? metrics.totalValue / properties.length : 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from(new Set(properties.map(p => `${p.city}, ${p.state}`))).map((location) => {
                  const locationProperties = properties.filter(p => `${p.city}, ${p.state}` === location)
                  const locationValue = locationProperties.reduce((sum, p) => sum + p.currentValue, 0)
                  const percentage = metrics.totalValue > 0 ? (locationValue / metrics.totalValue) * 100 : 0

                  return (
                    <div key={location} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{location}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                        <Badge variant="outline" className="text-xs">
                          {locationProperties.length}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Property Details Dialog */}
      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedProperty.name}</DialogTitle>
              <DialogDescription>
                {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Property Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span>{selectedProperty.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Date</span>
                      <span>{selectedProperty.purchaseDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Square Feet</span>
                      <span>{selectedProperty.sqft.toLocaleString()}</span>
                    </div>
                    {selectedProperty.units && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Units</span>
                        <span>{selectedProperty.units}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Financial Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Price</span>
                      <span>{formatCurrency(selectedProperty.purchasePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Value</span>
                      <span>{formatCurrency(selectedProperty.currentValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Equity Invested</span>
                      <span>{formatCurrency(selectedProperty.equityInvested)}</span>
                    </div>
                    {selectedProperty.loanAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loan Balance</span>
                        <span>{formatCurrency(selectedProperty.loanAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Income & Returns</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Income</span>
                      <span>{formatCurrency(selectedProperty.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operating Expenses</span>
                      <span>{formatCurrency(selectedProperty.expenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">NOI</span>
                      <span>{formatCurrency(selectedProperty.noi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Flow</span>
                      <span>{formatCurrency(selectedProperty.cashFlow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cap Rate</span>
                      <span>{formatPercentage(selectedProperty.currentCapRate)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Return</span>
                      <span className={`font-medium ${
                        selectedProperty.totalReturn > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(selectedProperty.totalReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Equity</span>
                      <span>{formatCurrency(selectedProperty.currentValue - (selectedProperty.loanAmount || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash-on-Cash Return</span>
                      <span>{formatPercentage(selectedProperty.cashFlow / selectedProperty.equityInvested)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
