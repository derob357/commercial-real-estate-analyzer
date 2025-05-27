"use client"

import { useState } from "react"
import { MapPin, Search, Target, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RadiusSearchPromptProps {
  centerZipCode: string
  showPrompt: boolean
  onRadiusSelect: (radius: number) => void
  onCancel: () => void
  isSearching?: boolean
  searchProgress?: {
    currentRadius: number
    zipCodesSearched: number
    totalZipCodes: number
    propertiesFound: number
    message: string
  }
}

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
  distance?: number
}

const RADIUS_OPTIONS = [
  {
    value: 25,
    label: "25 miles",
    description: "Local area search",
    estimatedZips: "~15-30 zip codes",
    icon: "🎯"
  },
  {
    value: 50,
    label: "50 miles",
    description: "Regional search",
    estimatedZips: "~50-100 zip codes",
    icon: "📍"
  },
  {
    value: 100,
    label: "100 miles",
    description: "Metropolitan area",
    estimatedZips: "~150-300 zip codes",
    icon: "🗺️"
  }
]

export default function RadiusSearchPrompt({
  centerZipCode,
  showPrompt,
  onRadiusSelect,
  onCancel,
  isSearching = false,
  searchProgress
}: RadiusSearchPromptProps) {
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null)

  const handleRadiusSelect = (radius: number) => {
    setSelectedRadius(radius)
    onRadiusSelect(radius)
  }

  const formatZipCode = (zipCode: string) => {
    return zipCode.replace(/(\d{5})/, '$1')
  }

  return (
    <Dialog open={showPrompt} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span>No Properties Found</span>
          </DialogTitle>
          <DialogDescription>
            No commercial properties were found in zip code {formatZipCode(centerZipCode)}.
            Would you like to expand your search to nearby areas?
          </DialogDescription>
        </DialogHeader>

        {!isSearching ? (
          <div className="space-y-6">
            {/* Search Area Visualization */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Center: {formatZipCode(centerZipCode)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Radius Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Choose search radius:</h4>
              <div className="grid grid-cols-1 gap-3">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRadiusSelect(option.value)}
                    className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                          <div className="text-xs text-gray-500">{option.estimatedZips}</div>
                        </div>
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        Search →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>

            {/* Search Tips */}
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
              <strong>💡 Search Tips:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Larger radius = more properties but longer search time</li>
                <li>• We'll search all zip codes within your selected radius</li>
                <li>• Results will show distance from your original zip code</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Searching within {selectedRadius} miles...
                </h4>
                <Badge variant="outline" className="bg-blue-50">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Searching
                </Badge>
              </div>

              {searchProgress && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{searchProgress.zipCodesSearched} of {searchProgress.totalZipCodes} zip codes</span>
                    </div>
                    <Progress
                      value={searchProgress.totalZipCodes > 0 ? (searchProgress.zipCodesSearched / searchProgress.totalZipCodes) * 100 : 0}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {searchProgress.zipCodesSearched}
                      </div>
                      <div className="text-sm text-gray-600">Zip Codes Searched</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {searchProgress.propertiesFound}
                      </div>
                      <div className="text-sm text-gray-600">Properties Found</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>{searchProgress.message}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cancel Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancel Search
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
