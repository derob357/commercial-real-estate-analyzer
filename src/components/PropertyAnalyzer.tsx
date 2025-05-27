"use client"

import { useState, useEffect } from "react"
import { Calculator, TrendingUp, DollarSign, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import TaxAssessorLookup from "./TaxAssessorLookup"

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

interface PropertyAnalyzerProps {
  property: Property
}

interface AnalysisResults {
  noi?: number
  capRate?: number
  cashOnCashReturn?: number
  dscr?: number
  grm?: number
  pricePerUnit?: number
  pricePerSqft?: number
  taxAssessedValue?: number
  effectiveTaxRate?: number
}

export default function PropertyAnalyzer({ property }: PropertyAnalyzerProps) {
  const [analysis, setAnalysis] = useState<AnalysisResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const runAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_data: {
            address: property.address,
            city: property.city,
            state: property.state,
            zip_code: property.zipCode,
            property_type: property.propertyType,
            units: property.units,
            sqft: property.sqft,
            listing_price: property.listingPrice,
          },
          financial_inputs: {
            purchase_price: property.listingPrice || 0,
            down_payment_percent: 0.25,
            interest_rate: 0.045,
            loan_term_years: 30,
            gross_rental_income: property.noi ? property.noi / 0.7 : 0, // Estimate based on 70% NOI ratio
            vacancy_rate: 0.05,
            annual_expenses: property.noi ? (property.noi / 0.7) * 0.3 : 0, // Estimate 30% expense ratio
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis || {})
      } else {
        setError('Failed to analyze property')
      }
    } catch (err) {
      setError('Error running analysis')
      console.error('Analysis error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run basic analysis when property is selected
    if (property.listingPrice && property.capRate) {
      setAnalysis({
        capRate: property.capRate,
        noi: property.noi,
        pricePerUnit: property.units ? property.listingPrice / property.units : undefined,
        pricePerSqft: property.sqft ? property.listingPrice / property.sqft : undefined,
      })
    }
  }, [property])

  return (
    <div className="space-y-4">
      {/* Property Summary */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">{property.address}</h3>
        <p className="text-sm text-gray-600">
          {property.city}, {property.state} {property.zipCode}
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{property.propertyType}</Badge>
          {property.listingSource && (
            <Badge variant="secondary">{property.listingSource}</Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Basic Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">List Price</p>
          <p className="font-semibold">{formatCurrency(property.listingPrice)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Cap Rate</p>
          <p className="font-semibold">{formatPercentage(property.capRate)}</p>
        </div>
        {property.units && (
          <div>
            <p className="text-sm text-gray-600">Units</p>
            <p className="font-semibold">{property.units}</p>
          </div>
        )}
        {property.sqft && (
          <div>
            <p className="text-sm text-gray-600">Square Feet</p>
            <p className="font-semibold">{property.sqft.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Financial Analysis</h4>
            <div className="grid grid-cols-1 gap-3">
              {analysis.noi && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">NOI</span>
                  <span className="font-medium">{formatCurrency(analysis.noi)}</span>
                </div>
              )}
              {analysis.pricePerUnit && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price per Unit</span>
                  <span className="font-medium">{formatCurrency(analysis.pricePerUnit)}</span>
                </div>
              )}
              {analysis.pricePerSqft && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price per Sq Ft</span>
                  <span className="font-medium">{formatCurrency(analysis.pricePerSqft)}</span>
                </div>
              )}
              {analysis.cashOnCashReturn && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cash-on-Cash Return</span>
                  <span className="font-medium">{formatPercentage(analysis.cashOnCashReturn)}</span>
                </div>
              )}
              {analysis.dscr && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">DSCR</span>
                  <span className="font-medium">{analysis.dscr.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tax Data */}
      {analysis?.taxAssessedValue && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Tax Assessment Data</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Assessed Value</span>
                <span className="font-medium">{formatCurrency(analysis.taxAssessedValue)}</span>
              </div>
              {analysis.effectiveTaxRate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Effective Tax Rate</span>
                  <span className="font-medium">{formatPercentage(analysis.effectiveTaxRate)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Action Button */}
      <Button
        onClick={runAnalysis}
        disabled={isLoading || !property.listingPrice}
        className="w-full"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Running Enhanced Analysis...
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4 mr-2" />
            Run Enhanced Analysis
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <Separator />

      {/* Tax Assessor Lookup */}
      <TaxAssessorLookup
        property={property}
        onTaxDataFound={(taxData) => {
          // Update analysis with tax data
          setAnalysis(prev => ({
            ...prev,
            taxAssessedValue: taxData.assessedValue,
            effectiveTaxRate: taxData.annualTaxes && taxData.assessedValue ?
              taxData.annualTaxes / taxData.assessedValue : undefined
          }))
        }}
      />
    </div>
  )
}
