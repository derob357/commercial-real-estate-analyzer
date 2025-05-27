'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, Download } from 'lucide-react'
import { toast } from 'sonner'

interface AnalysisInputs {
  purchasePrice: number
  downPayment: number
  interestRate: number
  loanTerm: number
  monthlyRent: number
  vacancy: number
  propertyTaxes: number
}

interface AnalysisResults {
  monthlyNOI: number
  annualNOI: number
  capRate: number
  cashOnCash: number
  debtServiceCoverage: number
  totalCashRequired: number
  monthlyDebtService: number
  monthlyCashFlow: number
  annualCashFlow: number
}

export default function PropertyAnalysis() {
  const [inputs, setInputs] = useState<AnalysisInputs>({
    purchasePrice: 2850000,
    downPayment: 25,
    interestRate: 6.5,
    loanTerm: 30,
    monthlyRent: 18500,
    vacancy: 5,
    propertyTaxes: 31500
  })

  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: keyof AnalysisInputs, value: string) => {
    setInputs(prev => ({
      ...prev,
      [field]: Number.parseFloat(value) || 0
    }))
  }

  const calculateAnalysis = async () => {
    setIsLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      const loanAmount = inputs.purchasePrice * (1 - inputs.downPayment / 100)
      const monthlyInterestRate = inputs.interestRate / 100 / 12
      const numberOfPayments = inputs.loanTerm * 12
      
      const monthlyDebtService = loanAmount * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)

      const effectiveMonthlyRent = inputs.monthlyRent * (1 - inputs.vacancy / 100)
      const monthlyPropertyTaxes = inputs.propertyTaxes / 12
      const monthlyNOI = effectiveMonthlyRent - monthlyPropertyTaxes
      const annualNOI = monthlyNOI * 12
      const monthlyCashFlow = monthlyNOI - monthlyDebtService
      const annualCashFlow = monthlyCashFlow * 12

      const capRate = (annualNOI / inputs.purchasePrice) * 100
      const totalCashRequired = inputs.purchasePrice * (inputs.downPayment / 100)
      const cashOnCash = (annualCashFlow / totalCashRequired) * 100
      const debtServiceCoverage = monthlyNOI / monthlyDebtService

      const calculatedResults: AnalysisResults = {
        monthlyNOI,
        annualNOI,
        capRate,
        cashOnCash,
        debtServiceCoverage,
        totalCashRequired,
        monthlyDebtService,
        monthlyCashFlow,
        annualCashFlow
      }

      setResults(calculatedResults)
      toast.success('Analysis completed successfully')
    } catch (error) {
      toast.error('Failed to calculate analysis')
      console.error('Analysis error:', error)
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

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Financial Analysis</h1>
          <p className="text-gray-600">Comprehensive deal analysis with financial calculations</p>
        </div>
        {results && (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Analysis Inputs
              </CardTitle>
              <CardDescription>
                Enter property details and assumptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    value={inputs.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    placeholder="2850000"
                  />
                </div>

                <div>
                  <Label htmlFor="downPayment">Down Payment (%)</Label>
                  <Input
                    id="downPayment"
                    value={inputs.downPayment}
                    onChange={(e) => handleInputChange('downPayment', e.target.value)}
                    placeholder="25"
                  />
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    value={inputs.interestRate}
                    onChange={(e) => handleInputChange('interestRate', e.target.value)}
                    placeholder="6.5"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyRent">Monthly Rent</Label>
                  <Input
                    id="monthlyRent"
                    value={inputs.monthlyRent}
                    onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                    placeholder="18500"
                  />
                </div>

                <div>
                  <Label htmlFor="vacancy">Vacancy Rate (%)</Label>
                  <Input
                    id="vacancy"
                    value={inputs.vacancy}
                    onChange={(e) => handleInputChange('vacancy', e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div>
                  <Label htmlFor="propertyTaxes">Annual Property Taxes</Label>
                  <Input
                    id="propertyTaxes"
                    value={inputs.propertyTaxes}
                    onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                    placeholder="31500"
                  />
                </div>
              </div>

              <Button 
                onClick={calculateAnalysis} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Calculating...' : 'Calculate Analysis'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Cap Rate</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercent(results.capRate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.capRate > 5 ? 'Good' : results.capRate > 4 ? 'Fair' : 'Low'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Cash on Cash</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercent(results.cashOnCash)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.cashOnCash > 8 ? 'Excellent' : results.cashOnCash > 6 ? 'Good' : 'Fair'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">DSCR</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {results.debtServiceCoverage.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.debtServiceCoverage > 1.25 ? 'Strong' : results.debtServiceCoverage > 1.1 ? 'Good' : 'Weak'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Monthly Cash Flow</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(results.monthlyCashFlow)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.monthlyCashFlow > 0 ? 'Positive' : 'Negative'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Deal Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Investment Details</div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Purchase Price:</span>
                          <span className="font-semibold">{formatCurrency(inputs.purchasePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Down Payment:</span>
                          <span className="font-semibold">{formatCurrency(results.totalCashRequired)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Loan Amount:</span>
                          <span className="font-semibold">{formatCurrency(inputs.purchasePrice - results.totalCashRequired)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Annual Returns</div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Gross Rental Income:</span>
                          <span className="font-semibold">{formatCurrency(inputs.monthlyRent * 12)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Operating Income:</span>
                          <span className="font-semibold">{formatCurrency(results.annualNOI)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash Flow:</span>
                          <span className="font-semibold">{formatCurrency(results.annualCashFlow)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold mb-1">Deal Rating</div>
                        <div className="text-sm text-gray-600">
                          Based on cap rate, cash-on-cash return, and DSCR
                        </div>
                      </div>
                      <div className="text-right">
                        {results.capRate > 5 && results.cashOnCash > 8 && results.debtServiceCoverage > 1.25 ? (
                          <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                        ) : results.capRate > 4 && results.cashOnCash > 6 && results.debtServiceCoverage > 1.1 ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Fair</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-gray-500 mb-4">
                  Enter your property details and click "Calculate Analysis" to get started
                </p>
                <Button onClick={calculateAnalysis} size="lg">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}