'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AnalysisResult {
  property: any
  financials: any
  analysis: any
  tax_data?: any
  data_quality: any
}

export default function EnhancedAnalysisTest() {
  const [formData, setFormData] = useState({
    // Property Data
    address: '123 Main St',
    city: 'Beverly Hills',
    state: 'CA',
    zip_code: '90210',
    units: 10,
    sq_ft: 8000,
    year_built: 1995,
    
    // Financial Data
    purchasePrice: 2500000,
    downPaymentPercent: 25,
    interestRate: 7.0,
    loanTermYears: 30,
    grossRentalIncome: 360000,
    vacancyRate: 5,
    propertyManagement: 28800, // 8% of income
    maintenanceRepairs: 18000,  // 5% of income
    insurance: 7500,
    utilities: 12000,
    otherExpenses: 5000
  })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
    }))
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload = {
        property_data: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          units: formData.units,
          sq_ft: formData.sq_ft,
          year_built: formData.year_built,
          property_type: 'multifamily'
        },
        financials: {
          purchasePrice: formData.purchasePrice,
          downPaymentPercent: formData.downPaymentPercent,
          interestRate: formData.interestRate,
          loanTermYears: formData.loanTermYears,
          grossRentalIncome: formData.grossRentalIncome,
          vacancyRate: formData.vacancyRate,
          propertyManagement: formData.propertyManagement,
          maintenanceRepairs: formData.maintenanceRepairs,
          insurance: formData.insurance,
          utilities: formData.utilities,
          otherExpenses: formData.otherExpenses
        },
        include_tax_data: true,
        force_refresh_tax: true
      }

      const response = await fetch('/api/analyze/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | undefined) => {
    return value ? `$${value.toLocaleString()}` : 'N/A'
  }

  const formatPercent = (value: number | undefined) => {
    return value ? `${(value * 100).toFixed(2)}%` : 'N/A'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Property Analysis</CardTitle>
          <CardDescription>
            Test the comprehensive underwriting system with tax assessor data integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Property Information</h3>
              <div className="space-y-2">
                <Input
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Units"
                    value={formData.units}
                    onChange={(e) => handleInputChange('units', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Sq Ft"
                    value={formData.sq_ft}
                    onChange={(e) => handleInputChange('sq_ft', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Year Built"
                    value={formData.year_built}
                    onChange={(e) => handleInputChange('year_built', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Financial Basics */}
            <div className="space-y-4">
              <h3 className="font-semibold">Purchase & Financing</h3>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Purchase Price"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Down Payment %"
                  value={formData.downPaymentPercent}
                  onChange={(e) => handleInputChange('downPaymentPercent', e.target.value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Interest Rate %"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Loan Term (Years)"
                  value={formData.loanTermYears}
                  onChange={(e) => handleInputChange('loanTermYears', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Gross Rental Income"
                  value={formData.grossRentalIncome}
                  onChange={(e) => handleInputChange('grossRentalIncome', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Vacancy Rate %"
                  value={formData.vacancyRate}
                  onChange={(e) => handleInputChange('vacancyRate', e.target.value)}
                />
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-4">
              <h3 className="font-semibold">Operating Expenses</h3>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Property Management"
                  value={formData.propertyManagement}
                  onChange={(e) => handleInputChange('propertyManagement', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Maintenance & Repairs"
                  value={formData.maintenanceRepairs}
                  onChange={(e) => handleInputChange('maintenanceRepairs', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Insurance"
                  value={formData.insurance}
                  onChange={(e) => handleInputChange('insurance', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Utilities"
                  value={formData.utilities}
                  onChange={(e) => handleInputChange('utilities', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Other Expenses"
                  value={formData.otherExpenses}
                  onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={runAnalysis} disabled={loading} className="w-full">
              {loading ? 'Analyzing...' : 'Run Enhanced Analysis'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Financial Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercent(result.analysis.capRate)}
                  </div>
                  <div className="text-sm text-gray-600">Cap Rate</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(result.analysis.cashFlow)}
                  </div>
                  <div className="text-sm text-gray-600">Annual Cash Flow</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercent(result.analysis.cashOnCashReturn)}
                  </div>
                  <div className="text-sm text-gray-600">Cash-on-Cash Return</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.analysis.debtServiceCoverage?.toFixed(2) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">DSCR</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax-Enhanced Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Tax-Enhanced Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Tax Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Effective Tax Rate:</span>
                      <span>{formatPercent(result.analysis.effectiveTaxRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assessed vs Market:</span>
                      <span>{result.analysis.taxAssessedVsMarket?.toFixed(2) || 'N/A'}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3-Year Tax Trend:</span>
                      <span>{formatPercent(result.analysis.taxTrend3Year)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Appeal Potential:</span>
                      <Badge variant={result.analysis.taxAppealPotential ? 'destructive' : 'default'}>
                        {result.analysis.taxAppealPotential ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Additional Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Break-Even Rent:</span>
                      <span>{formatCurrency(result.analysis.break_even_rent / 12)} /month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Price (10% COC):</span>
                      <span>{formatCurrency(result.analysis.max_purchase_price_for_10_percent_return)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assessment Risk:</span>
                      <Badge variant={
                        result.analysis.assessmentIncreaseRisk === 'high' ? 'destructive' :
                        result.analysis.assessmentIncreaseRisk === 'medium' ? 'secondary' : 'default'
                      }>
                        {result.analysis.assessmentIncreaseRisk || 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations & Warnings */}
          {(result.analysis.recommendations?.length > 0 || result.analysis.warnings?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.analysis.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-2">Recommendations</h4>
                      <ul className="space-y-2 text-sm">
                        {result.analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.analysis.warnings?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">Warnings</h4>
                      <ul className="space-y-2 text-sm">
                        {result.analysis.warnings.map((warning: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-red-500 mr-2">⚠</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <Badge variant={result.data_quality.tax_data_available ? 'default' : 'secondary'}>
                    {result.data_quality.tax_data_available ? 'Available' : 'Unavailable'}
                  </Badge>
                  <div className="text-xs text-gray-600 mt-1">Tax Data</div>
                </div>
                <div className="text-center">
                  <Badge variant={result.data_quality.tax_data_recent ? 'default' : 'secondary'}>
                    {result.data_quality.tax_data_recent ? 'Recent' : 'Stale'}
                  </Badge>
                  <div className="text-xs text-gray-600 mt-1">Data Freshness</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {(result.data_quality.address_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Address Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {Object.values(result.data_quality.estimated_values).filter(Boolean).length}
                  </div>
                  <div className="text-xs text-gray-600">Estimated Values</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}