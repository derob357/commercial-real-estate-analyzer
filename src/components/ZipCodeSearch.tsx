"use client"

import { useState } from "react"
import { Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface ZipCodeSearchProps {
  onZipCodeSelect: (zipCode: string) => void
}

interface ZipCodeSuggestion {
  zipCode: string
  city: string
  state: string
  county: string
}

export default function ZipCodeSearch({ onZipCodeSelect }: ZipCodeSearchProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<ZipCodeSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Popular zip codes for quick access
  const popularZipCodes: ZipCodeSuggestion[] = [
    { zipCode: "90210", city: "Beverly Hills", state: "CA", county: "Los Angeles" },
    { zipCode: "10001", city: "New York", state: "NY", county: "New York" },
    { zipCode: "75201", city: "Dallas", state: "TX", county: "Dallas" },
    { zipCode: "60601", city: "Chicago", state: "IL", county: "Cook" },
    { zipCode: "33101", city: "Miami", state: "FL", county: "Miami-Dade" },
    { zipCode: "98101", city: "Seattle", state: "WA", county: "King" },
    { zipCode: "30301", city: "Atlanta", state: "GA", county: "Fulton" },
    { zipCode: "85001", city: "Phoenix", state: "AZ", county: "Maricopa" },
  ]

  const handleSearch = async () => {
    if (query.length >= 5) {
      onZipCodeSelect(query)
      setShowSuggestions(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleZipCodeSelect = (zipCode: string) => {
    setQuery(zipCode)
    setShowSuggestions(false)
    onZipCodeSelect(zipCode)
  }

  const handleInputChange = (value: string) => {
    setQuery(value)

    if (value.length >= 2) {
      // Filter popular zip codes based on input
      const filtered = popularZipCodes.filter(
        (item) =>
          item.zipCode.includes(value) ||
          item.city.toLowerCase().includes(value.toLowerCase()) ||
          item.state.toLowerCase().includes(value.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter zip code (e.g., 90210) or city name..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              <Command>
                <CommandList>
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.zipCode}
                        onSelect={() => handleZipCodeSelect(suggestion.zipCode)}
                        className="cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {suggestion.zipCode} - {suggestion.city}, {suggestion.state}
                          </span>
                          <span className="text-sm text-gray-500">
                            {suggestion.county} County
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>
        <Button onClick={handleSearch} disabled={query.length < 5}>
          Search
        </Button>
      </div>

      {/* Quick Access Buttons */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Popular Markets:</p>
        <div className="flex flex-wrap gap-2">
          {popularZipCodes.slice(0, 6).map((item) => (
            <Button
              key={item.zipCode}
              variant="outline"
              size="sm"
              onClick={() => handleZipCodeSelect(item.zipCode)}
              className="text-xs"
            >
              {item.city}, {item.state}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
