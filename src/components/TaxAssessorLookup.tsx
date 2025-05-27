"use client"

import { useState } from "react"
import { Building2, Search, AlertCircle, CheckCircle, Clock, ExternalLink, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Property {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
}

interface TaxAssessorLookupProps {
  property: Property
  onTaxDataFound?: (taxData: TaxAssessmentData) => void
}

interface TaxAssessmentData {
  assessedValue?: number
  landValue?: number
  improvementValue?: number
  taxRate?: number
  annualTaxes?: number
  assessmentYear?: number
  lastPaymentDate?: string
  assessorUrl?: string
  taxHistory?: TaxPayment[]
  ownerName?: string
  propertyId?: string
  exemptions?: string[]
}

interface TaxPayment {
  year: number
  amount: number
  status: 'paid' | 'delinquent' | 'pending'
  paymentDate?: string
}

interface LookupJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startTime: Date
  endTime?: Date
}

export default function TaxAssessorLookup({ property, onTaxDataFound }: TaxAssessorLookupProps) {
  const [taxData, setTaxData] = useState<TaxAssessmentData | null>(null)
  const [lookupJob, setLookupJob] = useState<LookupJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

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
    return `${(rate * 100).toFixed(3)}%`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'running':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Search className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
      case 'pending':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/tax-assessor/status/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        const updatedJob: LookupJob = {
          id: jobId,
          status: data.status,
          progress: data.progress || 0,
          message: data.message || 'Processing...',
          startTime: new Date(data.startTime),
          endTime: data.endTime ? new Date(data.endTime) : undefined
        }

        setLookupJob(updatedJob)

        if (data.status === 'completed' && data.result) {
          setTaxData(data.result)
          onTaxDataFound?.(data.result)
          setIsLoading(false)
        } else if (data.status === 'failed') {
          setError(data.error || 'Tax lookup failed')
          setIsLoading(false)
        } else if (data.status === 'running' || data.status === 'pending') {
          // Continue polling
          setTimeout(() => pollJobStatus(jobId), 2000)
        }
      }
    } catch (err) {
      console.error('Error polling job status:', err)
      setError('Failed to check lookup status')
      setIsLoading(false)
    }
  }

  const startTaxLookup = async () => {
    setIsLoading(true)
    setError(null)
    setTaxData(null)
    setLookupJob(null)

    try {
      const response = await fetch('/api/tax-assessor/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: property.address,
          city: property.city,
          state: property.state,
          zip_code: property.zipCode,
        })
      })

      if (response.ok) {
        const data = await response.json()

        if (data.jobId) {
          // Start polling for job status
          setLookupJob({
            id: data.jobId,
            status: 'pending',
            progress: 0,
            message: 'Starting tax assessor lookup...',
            startTime: new Date()
          })
          pollJobStatus(data.jobId)
        } else if (data.taxData) {
          // Immediate response
          setTaxData(data.taxData)
          onTaxDataFound?.(data.taxData)
          setIsLoading(false)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Tax lookup failed')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Tax lookup error:', err)
      setError('Failed to start tax lookup')
      setIsLoading(false)
    }
  }

  const calculateTaxMetrics = () => {
    if (!taxData) return null

    const metrics = []

    // Assessment ratio (assessed value vs typical market value estimate)
    if (taxData.assessedValue) {
      metrics.push({
        label: 'Assessed Value',
        value: formatCurrency(taxData.assessedValue),
        description: `${taxData.assessmentYear || 'Current'} assessment`
      })
    }

    // Effective tax rate
    if (taxData.annualTaxes && taxData.assessedValue) {
      const effectiveRate = taxData.annualTaxes / taxData.assessedValue
      metrics.push({
        label: 'Effective Tax Rate',
        value: formatPercentage(effectiveRate),
        description: 'Annual taxes / assessed value'
      })
    }

    // Tax per square foot (if property has sqft data)
    if (taxData.annualTaxes) {
      metrics.push({
        label: 'Annual Property Taxes',
        value: formatCurrency(taxData.annualTaxes),
        description: 'Current year assessment'
      })
    }

    return metrics
  }

  const getCountyInfo = () => {
    const stateCounties: { [key: string]: string[] } = {
      'CA': ['Los Angeles', 'Orange', 'San Diego', 'Santa Clara', 'Alameda'],
      'NY': ['New York', 'Kings', 'Queens', 'Suffolk', 'Nassau'],
      'TX': ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis'],
      'FL': ['Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange'],
      'IL': ['Cook', 'DuPage', 'Lake', 'Will', 'Kane']
    }

    const supported = stateCounties[property.state] || []
    return {
      isSupported: supported.length > 0,
      counties: supported
    }
  }

  const countyInfo = getCountyInfo()
  const taxMetrics = calculateTaxMetrics()

  return (
    <div className="space-y-4">
      {/* Header with Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Tax Assessor Data</h3>
          <p className="text-sm text-gray-600">
            Official property assessment and tax information
          </p>
        </div>
        <Button
          onClick={startTaxLookup}
          disabled={isLoading}
          variant={taxData ? "outline" : "default"}
        >
          {isLoading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-pulse" />
              Looking up...
            </>
          ) : taxData ? (
            <>
              <Search className="h-4 w-4 mr-2" />
              Refresh
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 mr-2" />
              Get Tax Data
            </>
          )}
        </Button>
      </div>

      {/* County Support Info */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Badge variant={countyInfo.isSupported ? "default" : "secondary"}>
            {property.state}
          </Badge>
          <span className="text-sm text-gray-600">
            {countyInfo.isSupported ? 'Supported region' : 'Limited support'}
          </span>
        </div>
        {countyInfo.isSupported && (
          <span className="text-xs text-green-600">
            ✓ Direct tax assessor access
          </span>
        )}
      </div>

      {/* Job Status */}
      {lookupJob && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(lookupJob.status)}
                <span className={`text-sm font-medium ${getStatusColor(lookupJob.status)}`}>
                  {lookupJob.status.charAt(0).toUpperCase() + lookupJob.status.slice(1)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Job ID: {lookupJob.id.slice(0, 8)}...
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{lookupJob.message}</p>
            {lookupJob.status === 'running' && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${lookupJob.progress}%` }}
                ></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Tax Data Results */}
      {taxData && (
        <div className="space-y-4">
          <Separator />

          {/* Key Metrics */}
          {taxMetrics && (
            <div className="grid grid-cols-1 gap-3">
              {taxMetrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">{metric.label}</span>
                    <p className="text-xs text-gray-500">{metric.description}</p>
                  </div>
                  <span className="font-medium">{metric.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Additional Details */}
          <div className="space-y-2">
            {taxData.ownerName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Owner</span>
                <span className="text-sm font-medium">{taxData.ownerName}</span>
              </div>
            )}
            {taxData.propertyId && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Property ID</span>
                <span className="text-sm font-medium">{taxData.propertyId}</span>
              </div>
            )}
            {taxData.lastPaymentDate && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Payment</span>
                <span className="text-sm font-medium">
                  {new Date(taxData.lastPaymentDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Exemptions */}
          {taxData.exemptions && taxData.exemptions.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Tax Exemptions:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {taxData.exemptions.map((exemption, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {exemption}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {taxData.assessorUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={taxData.assessorUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Official Record
                </a>
              </Button>
            )}

            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calculator className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tax Assessment Details</DialogTitle>
                  <DialogDescription>
                    Complete tax assessment information for {property.address}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Detailed breakdown would go here */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Land Value</p>
                      <p className="text-lg">{formatCurrency(taxData.landValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Improvement Value</p>
                      <p className="text-lg">{formatCurrency(taxData.improvementValue)}</p>
                    </div>
                  </div>

                  {taxData.taxHistory && (
                    <div>
                      <p className="font-medium mb-2">Payment History</p>
                      <div className="space-y-2">
                        {taxData.taxHistory.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <span>{payment.year}</span>
                            <span>{formatCurrency(payment.amount)}</span>
                            <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                              {payment.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!taxData && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tax assessment data available</p>
          <p className="text-sm">Click "Get Tax Data" to search official records</p>
        </div>
      )}
    </div>
  )
}
