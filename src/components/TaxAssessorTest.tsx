'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TaxData {
  property: any
  tax_data: {
    assessments: any[]
    payments: any[]
  }
  scrape_result?: {
    source: string
    scraped_at: string
  }
}

export default function TaxAssessorTest() {
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TaxData | null>(null)
  const [error, setError] = useState('')

  const testTaxAssessor = async () => {
    if (!address || !zipCode) {
      setError('Please enter both address and ZIP code')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/tax-assessor/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          zip_code: zipCode,
          force_refresh: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to fetch tax data')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const checkAssessorAvailability = async () => {
    if (!zipCode) {
      setError('Please enter ZIP code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/tax-assessor/sources/${zipCode}`)
      const data = await response.json()

      if (response.ok) {
        alert(JSON.stringify(data, null, 2))
      } else {
        setError(data.error || 'Failed to check assessor availability')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Assessor Data Test</CardTitle>
          <CardDescription>
            Test the tax assessor scraping system with real property addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Property Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ZIP Code</label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="90210"
                maxLength={5}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testTaxAssessor} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Scraping...' : 'Get Tax Data'}
            </Button>
            <Button 
              onClick={checkAssessorAvailability} 
              disabled={loading}
              variant="outline"
            >
              Check Availability
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Assessment Results</CardTitle>
            <CardDescription>
              Property: {result.property?.address}
              {result.scrape_result && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    Source: {result.scrape_result.source}
                  </Badge>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Information */}
              <div>
                <h3 className="font-semibold mb-3">Property Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Address:</strong> {result.property?.address}</div>
                  <div><strong>City:</strong> {result.property?.city}</div>
                  <div><strong>State:</strong> {result.property?.state}</div>
                  <div><strong>ZIP:</strong> {result.property?.zip_code}</div>
                  <div><strong>County:</strong> {result.property?.county || 'N/A'}</div>
                </div>
              </div>

              {/* Tax Assessments */}
              <div>
                <h3 className="font-semibold mb-3">Latest Assessment</h3>
                {result.tax_data?.assessments?.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {result.tax_data.assessments.slice(0, 1).map((assessment, idx) => (
                      <div key={idx}>
                        <div><strong>Year:</strong> {assessment.assessment_year}</div>
                        <div><strong>Assessed Value:</strong> ${assessment.assessed_value?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Land Value:</strong> ${assessment.land_value?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Improvement Value:</strong> ${assessment.improvement_value?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Annual Taxes:</strong> ${assessment.annual_taxes?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Tax Rate:</strong> {assessment.tax_rate ? (assessment.tax_rate * 100).toFixed(2) + '%' : 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No assessment data available</p>
                )}
              </div>
            </div>

            {/* Tax Payment History */}
            {result.tax_data?.payments?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Recent Tax Payments</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Amount Due</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Amount Paid</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tax_data.payments.slice(0, 5).map((payment, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2 text-sm">{payment.tax_year}</td>
                          <td className="px-4 py-2 text-sm">${payment.amount_due?.toLocaleString() || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">${payment.amount_paid?.toLocaleString() || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">
                            <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                              {payment.status || 'Unknown'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}