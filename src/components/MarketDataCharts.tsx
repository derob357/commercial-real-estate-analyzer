"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, MapPin, Users, DollarSign, Briefcase, Home } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts'

interface MarketDataChartsProps {
  zipCode: string
}

interface MarketTrend {
  month: string
  capRate: number
  avgPrice: number
  inventory: number
  vacancyRate: number
  medianIncome: number
}

interface PropertyTypeData {
  type: string
  avgCapRate: number
  avgPrice: number
  inventory: number
  color: string
}

interface EconomicIndicators {
  costOfLivingIndex: number // 100 = national average
  costOfLivingRank: number // national ranking (1-400)
  unemploymentRate: number
  nationalUnemploymentRate: number
  jobGrowthRate: number
  nationalJobGrowthRate: number
  businessRanking: number // 1-50 state ranking
  businessScore: number
  populationGrowth: number
  householdFormations: number
  medianAge: number
  medianIncome: number
  nationalMedianIncome: number
}

interface DemographicData {
  category: string
  local: number
  national: number
  color: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function MarketDataCharts({ zipCode }: MarketDataChartsProps) {
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeData[]>([])
  const [economicIndicators, setEconomicIndicators] = useState<EconomicIndicators | null>(null)
  const [demographicComparison, setDemographicComparison] = useState<DemographicData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    generateMockData()
  }, [zipCode])

  const generateMockData = () => {
    setIsLoading(true)

    // Generate mock market trend data (12 months)
    const trends: MarketTrend[] = []
    const baseCapRate = 0.045 + (Math.random() * 0.03) // 4.5-7.5%
    const basePrice = 800000 + (Math.random() * 1500000) // $800k-$2.3M
    const baseIncome = 65000 + (Math.random() * 80000) // $65k-$145k

    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)

      trends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        capRate: baseCapRate + (Math.random() - 0.5) * 0.01,
        avgPrice: basePrice + (Math.random() - 0.5) * 200000,
        inventory: Math.floor(50 + Math.random() * 100),
        vacancyRate: 0.03 + Math.random() * 0.08,
        medianIncome: baseIncome + (Math.random() - 0.5) * 10000
      })
    }

    // Generate property type distribution
    const types: PropertyTypeData[] = [
      { type: 'Apartment', avgCapRate: 0.048, avgPrice: 1200000, inventory: 45, color: COLORS[0] },
      { type: 'Mixed Use', avgCapRate: 0.055, avgPrice: 950000, inventory: 28, color: COLORS[1] },
      { type: 'Retail', avgCapRate: 0.062, avgPrice: 800000, inventory: 18, color: COLORS[2] },
      { type: 'Office', avgCapRate: 0.058, avgPrice: 1100000, inventory: 12, color: COLORS[3] },
      { type: 'Industrial', avgCapRate: 0.065, avgPrice: 650000, inventory: 8, color: COLORS[4] }
    ]

    // Generate economic indicators based on zip code
    const indicators: EconomicIndicators = generateEconomicData(zipCode)

    // Generate demographic comparison data
    const demographics: DemographicData[] = [
      {
        category: 'Cost of Living',
        local: indicators.costOfLivingIndex,
        national: 100,
        color: indicators.costOfLivingIndex > 100 ? '#FF8042' : '#00C49F'
      },
      {
        category: 'Unemployment Rate',
        local: indicators.unemploymentRate,
        national: indicators.nationalUnemploymentRate,
        color: indicators.unemploymentRate < indicators.nationalUnemploymentRate ? '#00C49F' : '#FF8042'
      },
      {
        category: 'Job Growth',
        local: indicators.jobGrowthRate,
        national: indicators.nationalJobGrowthRate,
        color: indicators.jobGrowthRate > indicators.nationalJobGrowthRate ? '#00C49F' : '#FF8042'
      },
      {
        category: 'Median Income (k)',
        local: indicators.medianIncome / 1000,
        national: indicators.nationalMedianIncome / 1000,
        color: indicators.medianIncome > indicators.nationalMedianIncome ? '#00C49F' : '#FF8042'
      }
    ]

    setMarketTrends(trends)
    setPropertyTypes(types)
    setEconomicIndicators(indicators)
    setDemographicComparison(demographics)
    setIsLoading(false)
  }

  const generateEconomicData = (zip: string): EconomicIndicators => {
    // Generate realistic data based on zip code patterns
    const isHighCostArea = ['90210', '10001', '94102', '33109', '02108'].includes(zip)
    const isMidCostArea = ['75201', '60601', '98101', '30301', '85001'].includes(zip)

    let costOfLivingIndex: number
    let businessRanking: number
    let medianIncome: number

    if (isHighCostArea) {
      costOfLivingIndex = 140 + Math.random() * 60 // 140-200
      businessRanking = 35 + Math.floor(Math.random() * 15) // 35-50 (lower ranking due to high costs)
      medianIncome = 95000 + Math.random() * 80000 // $95k-$175k
    } else if (isMidCostArea) {
      costOfLivingIndex = 105 + Math.random() * 25 // 105-130
      businessRanking = 10 + Math.floor(Math.random() * 20) // 10-30
      medianIncome = 65000 + Math.random() * 45000 // $65k-$110k
    } else {
      costOfLivingIndex = 85 + Math.random() * 25 // 85-110
      businessRanking = 1 + Math.floor(Math.random() * 15) // 1-15 (better for business)
      medianIncome = 45000 + Math.random() * 35000 // $45k-$80k
    }

    return {
      costOfLivingIndex,
      costOfLivingRank: Math.floor(50 + Math.random() * 300), // National ranking out of ~400 metros
      unemploymentRate: 2.8 + Math.random() * 4, // 2.8-6.8%
      nationalUnemploymentRate: 3.7,
      jobGrowthRate: -1 + Math.random() * 6, // -1% to 5%
      nationalJobGrowthRate: 1.8,
      businessRanking,
      businessScore: 100 - businessRanking * 2 + Math.random() * 10,
      populationGrowth: -0.5 + Math.random() * 4, // -0.5% to 3.5%
      householdFormations: 0.5 + Math.random() * 2.5, // 0.5% to 3%
      medianAge: 32 + Math.random() * 15, // 32-47
      medianIncome,
      nationalMedianIncome: 70784
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  const getIndicatorColor = (local: number, national: number, higherIsBetter = true) => {
    if (higherIsBetter) {
      return local > national ? 'text-green-600' : 'text-red-600'
    } else {
      return local < national ? 'text-green-600' : 'text-red-600'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}${entry.dataKey.includes('Rate') ? '%' : entry.dataKey.includes('Price') ? '' : ''}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-bold">Market Analysis - {zipCode}</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="economic">Economic</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Economic Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cost of Living</p>
                    <p className="text-2xl font-bold">{economicIndicators?.costOfLivingIndex.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">vs 100 (US avg)</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
                <Badge variant="outline" className="mt-2">
                  Rank #{economicIndicators?.costOfLivingRank}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unemployment</p>
                    <p className="text-2xl font-bold">{formatPercentage(economicIndicators?.unemploymentRate || 0)}</p>
                    <p className="text-xs text-gray-500">vs {formatPercentage(economicIndicators?.nationalUnemploymentRate || 0)} national</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-orange-600" />
                </div>
                <div className={`text-xs mt-2 ${getIndicatorColor(economicIndicators?.unemploymentRate || 0, economicIndicators?.nationalUnemploymentRate || 0, false)}`}>
                  {economicIndicators?.unemploymentRate && economicIndicators?.nationalUnemploymentRate &&
                    (economicIndicators.unemploymentRate < economicIndicators.nationalUnemploymentRate ? '↓ Below' : '↑ Above') + ' National Avg'
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Job Growth</p>
                    <p className="text-2xl font-bold">{formatPercentage(economicIndicators?.jobGrowthRate || 0)}</p>
                    <p className="text-xs text-gray-500">vs {formatPercentage(economicIndicators?.nationalJobGrowthRate || 0)} national</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className={`text-xs mt-2 ${getIndicatorColor(economicIndicators?.jobGrowthRate || 0, economicIndicators?.nationalJobGrowthRate || 0, true)}`}>
                  {economicIndicators?.jobGrowthRate && economicIndicators?.nationalJobGrowthRate &&
                    (economicIndicators.jobGrowthRate > economicIndicators.nationalJobGrowthRate ? '↑ Above' : '↓ Below') + ' National Avg'
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Business Ranking</p>
                    <p className="text-2xl font-bold">#{economicIndicators?.businessRanking}</p>
                    <p className="text-xs text-gray-500">State ranking (1-50)</p>
                  </div>
                  <Home className="h-8 w-8 text-purple-600" />
                </div>
                <Badge variant={economicIndicators?.businessRanking && economicIndicators.businessRanking <= 15 ? "default" : "secondary"} className="mt-2">
                  {economicIndicators?.businessRanking && economicIndicators.businessRanking <= 15 ? 'Excellent' :
                   economicIndicators?.businessRanking && economicIndicators.businessRanking <= 30 ? 'Good' : 'Average'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Demographic Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Population Growth</p>
                    <p className="text-2xl font-bold">{formatPercentage(economicIndicators?.populationGrowth || 0)}</p>
                    <p className="text-xs text-gray-500">Annual growth rate</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Household Formations</p>
                    <p className="text-2xl font-bold">{formatPercentage(economicIndicators?.householdFormations || 0)}</p>
                    <p className="text-xs text-gray-500">Annual rate</p>
                  </div>
                  <Home className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Median Age</p>
                    <p className="text-2xl font-bold">{economicIndicators?.medianAge.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Years</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Median Income</p>
                    <p className="text-2xl font-bold">{formatCurrency(economicIndicators?.medianIncome || 0)}</p>
                    <p className="text-xs text-gray-500">vs {formatCurrency(economicIndicators?.nationalMedianIncome || 0)} national</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <div className={`text-xs mt-2 ${getIndicatorColor(economicIndicators?.medianIncome || 0, economicIndicators?.nationalMedianIncome || 0, true)}`}>
                  {economicIndicators?.medianIncome && economicIndicators?.nationalMedianIncome &&
                    (economicIndicators.medianIncome > economicIndicators.nationalMedianIncome ? '↑ Above' : '↓ Below') + ' National Avg'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Property Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Property Type Distribution</CardTitle>
              <CardDescription>Commercial properties by type and average metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={propertyTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="inventory" fill="#8884d8" name="Inventory" />
                  <Line yAxisId="right" dataKey="avgCapRate" stroke="#82ca9d" name="Avg Cap Rate (%)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economic" className="space-y-4">
          {/* Economic Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Economic Indicators vs National Average</CardTitle>
              <CardDescription>Local market performance compared to national benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={demographicComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="local" fill="#8884d8" name="Local" />
                  <Bar dataKey="national" fill="#82ca9d" name="National Average" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Business Climate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Climate Score</CardTitle>
                <CardDescription>Overall business environment rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {economicIndicators?.businessScore.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Score out of 100
                    </div>
                    <Badge variant={economicIndicators?.businessScore && economicIndicators.businessScore > 75 ? "default" : "secondary"} className="mt-2">
                      {economicIndicators?.businessScore && economicIndicators.businessScore > 75 ? 'Excellent' :
                       economicIndicators?.businessScore && economicIndicators.businessScore > 60 ? 'Good' : 'Average'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Indicators</CardTitle>
                <CardDescription>Key growth metrics for the area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Population Growth</span>
                  <div className="flex items-center space-x-2">
                    {economicIndicators?.populationGrowth && economicIndicators.populationGrowth > 0 ?
                      <TrendingUp className="h-4 w-4 text-green-600" /> :
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    }
                    <span className="font-medium">{formatPercentage(economicIndicators?.populationGrowth || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Household Formations</span>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{formatPercentage(economicIndicators?.householdFormations || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Job Growth</span>
                  <div className="flex items-center space-x-2">
                    {economicIndicators?.jobGrowthRate && economicIndicators.jobGrowthRate > 0 ?
                      <TrendingUp className="h-4 w-4 text-green-600" /> :
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    }
                    <span className="font-medium">{formatPercentage(economicIndicators?.jobGrowthRate || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          {/* Demographics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <div className="text-2xl font-bold">{economicIndicators?.medianAge.toFixed(0)}</div>
                  <div className="text-sm text-gray-600">Median Age</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {economicIndicators?.medianAge && economicIndicators.medianAge < 35 ? 'Young' :
                     economicIndicators?.medianAge && economicIndicators.medianAge < 45 ? 'Middle-aged' : 'Mature'} Population
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <div className="text-2xl font-bold">{formatCurrency(economicIndicators?.medianIncome || 0)}</div>
                  <div className="text-sm text-gray-600">Median Household Income</div>
                  <div className={`text-xs mt-1 ${getIndicatorColor(economicIndicators?.medianIncome || 0, economicIndicators?.nationalMedianIncome || 0, true)}`}>
                    {economicIndicators?.medianIncome && economicIndicators?.nationalMedianIncome &&
                      ((economicIndicators.medianIncome / economicIndicators.nationalMedianIncome - 1) * 100).toFixed(0) + '% vs National'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Home className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <div className="text-2xl font-bold">{formatPercentage(economicIndicators?.householdFormations || 0)}</div>
                  <div className="text-sm text-gray-600">Household Formation Rate</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {economicIndicators?.householdFormations && economicIndicators.householdFormations > 2 ? 'Strong' :
                     economicIndicators?.householdFormations && economicIndicators.householdFormations > 1 ? 'Moderate' : 'Slow'} Growth
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income vs Cost of Living Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Affordability Analysis</CardTitle>
              <CardDescription>Income purchasing power adjusted for local cost of living</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Adjusted Purchasing Power</p>
                    <p className="text-sm text-gray-600">Local income adjusted for cost of living</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {economicIndicators && formatCurrency((economicIndicators.medianIncome / economicIndicators.costOfLivingIndex) * 100)}
                    </p>
                    <p className="text-sm text-gray-600">Effective buying power</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{economicIndicators?.costOfLivingIndex.toFixed(0)}</p>
                    <p className="text-sm text-gray-600">Cost of Living Index</p>
                    <p className="text-xs text-gray-500">100 = National Average</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">#{economicIndicators?.costOfLivingRank}</p>
                    <p className="text-sm text-gray-600">National Ranking</p>
                    <p className="text-xs text-gray-500">Out of ~400 metros</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Market Trends Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>12-Month Market Trends</CardTitle>
              <CardDescription>Historical performance and pricing trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgPrice" stroke="#8884d8" strokeWidth={2} name="Avg Price" />
                  <Line yAxisId="right" type="monotone" dataKey="capRate" stroke="#82ca9d" strokeWidth={2} name="Cap Rate %" />
                  <Line yAxisId="right" type="monotone" dataKey="vacancyRate" stroke="#ffc658" strokeWidth={2} name="Vacancy Rate %" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Income Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Income Growth Trend</CardTitle>
              <CardDescription>Median household income progression</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="medianIncome" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Median Income" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
