"use client"

import { useState, useEffect } from "react"
import { Bell, Plus, Settings, Target, TrendingUp, Building2, MapPin, DollarSign, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface InvestmentCriteria {
  id: string
  name: string
  location: string
  propertyType: string[]
  minCapRate?: number
  maxCapRate?: number
  minPrice?: number
  maxPrice?: number
  minUnits?: number
  maxUnits?: number
  minSqft?: number
  maxSqft?: number
  isActive: boolean
  emailNotifications: boolean
  createdAt: Date
  lastMatch?: Date
  matchCount: number
}

interface PropertyAlert {
  id: string
  criteriaId: string
  propertyId: string
  property: {
    address: string
    city: string
    state: string
    zipCode: string
    propertyType: string
    listingPrice: number
    capRate?: number
    units?: number
    sqft?: number
  }
  matchedAt: Date
  isViewed: boolean
}

// Southeastern US cities data
const SE_CITIES = [
  { value: "atlanta-ga", label: "Atlanta, GA", zipCodes: ["30301", "30302", "30303", "30309", "30313"] },
  { value: "warner-robins-ga", label: "Warner Robins, GA", zipCodes: ["31088", "31093", "31095"] },
  { value: "forsyth-ga", label: "Forsyth, GA", zipCodes: ["31029"] },
  { value: "savannah-ga", label: "Savannah, GA", zipCodes: ["31401", "31404", "31405", "31406"] },
  { value: "augusta-ga", label: "Augusta, GA", zipCodes: ["30901", "30904", "30906", "30909"] },
  { value: "columbus-ga", label: "Columbus, GA", zipCodes: ["31901", "31904", "31906", "31909"] },
  { value: "birmingham-al", label: "Birmingham, AL", zipCodes: ["35203", "35205", "35209", "35213"] },
  { value: "montgomery-al", label: "Montgomery, AL", zipCodes: ["36104", "36106", "36109", "36116"] },
  { value: "mobile-al", label: "Mobile, AL", zipCodes: ["36602", "36604", "36608", "36693"] },
  { value: "huntsville-al", label: "Huntsville, AL", zipCodes: ["35801", "35802", "35805", "35806"] },
  { value: "charleston-sc", label: "Charleston, SC", zipCodes: ["29401", "29403", "29407", "29412"] },
  { value: "columbia-sc", label: "Columbia, SC", zipCodes: ["29201", "29203", "29205", "29209"] },
  { value: "greenville-sc", label: "Greenville, SC", zipCodes: ["29601", "29605", "29607", "29615"] },
  { value: "jacksonville-fl", label: "Jacksonville, FL", zipCodes: ["32202", "32204", "32207", "32209"] },
  { value: "tampa-fl", label: "Tampa, FL", zipCodes: ["33602", "33605", "33607", "33612"] },
  { value: "orlando-fl", label: "Orlando, FL", zipCodes: ["32801", "32803", "32805", "32808"] },
  { value: "miami-fl", label: "Miami, FL", zipCodes: ["33101", "33125", "33127", "33130"] },
  { value: "nashville-tn", label: "Nashville, TN", zipCodes: ["37201", "37203", "37205", "37208"] },
  { value: "memphis-tn", label: "Memphis, TN", zipCodes: ["38103", "38104", "38106", "38109"] },
  { value: "knoxville-tn", label: "Knoxville, TN", zipCodes: ["37902", "37909", "37916", "37919"] },
  { value: "charlotte-nc", label: "Charlotte, NC", zipCodes: ["28202", "28204", "28205", "28209"] },
  { value: "raleigh-nc", label: "Raleigh, NC", zipCodes: ["27601", "27603", "27605", "27607"] },
  { value: "greensboro-nc", label: "Greensboro, NC", zipCodes: ["27401", "27403", "27405", "27407"] }
]

const PROPERTY_TYPES = [
  "Apartment", "Mixed Use", "Retail", "Office", "Industrial", "Self Storage", "Hotel", "Land"
]

export default function PropertyAlerts() {
  const [criteria, setCriteria] = useState<InvestmentCriteria[]>([])
  const [alerts, setAlerts] = useState<PropertyAlert[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCriteria, setEditingCriteria] = useState<InvestmentCriteria | null>(null)
  const [newCriteria, setNewCriteria] = useState<Partial<InvestmentCriteria>>({
    name: "",
    location: "",
    propertyType: [],
    isActive: true,
    emailNotifications: true,
    matchCount: 0
  })

  useEffect(() => {
    // Load saved criteria and alerts from localStorage
    loadSavedData()
    // Simulate checking for new matches
    checkForNewMatches()
  }, [])

  const loadSavedData = () => {
    try {
      const savedCriteria = localStorage.getItem('investmentCriteria')
      const savedAlerts = localStorage.getItem('propertyAlerts')

      if (savedCriteria) {
        const parsed = JSON.parse(savedCriteria).map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          lastMatch: c.lastMatch ? new Date(c.lastMatch) : undefined
        }))
        setCriteria(parsed)
      }

      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts).map((a: any) => ({
          ...a,
          matchedAt: new Date(a.matchedAt)
        }))
        setAlerts(parsed)
      }
    } catch (error) {
      console.error('Error loading saved data:', error)
    }
  }

  const saveCriteria = (newCriteria: InvestmentCriteria[]) => {
    localStorage.setItem('investmentCriteria', JSON.stringify(newCriteria))
    setCriteria(newCriteria)
  }

  const saveAlerts = (newAlerts: PropertyAlert[]) => {
    localStorage.setItem('propertyAlerts', JSON.stringify(newAlerts))
    setAlerts(newAlerts)
  }

  const createCriteria = () => {
    if (!newCriteria.name || !newCriteria.location) return

    const criteria: InvestmentCriteria = {
      id: `criteria_${Date.now()}`,
      name: newCriteria.name,
      location: newCriteria.location,
      propertyType: newCriteria.propertyType || [],
      minCapRate: newCriteria.minCapRate,
      maxCapRate: newCriteria.maxCapRate,
      minPrice: newCriteria.minPrice,
      maxPrice: newCriteria.maxPrice,
      minUnits: newCriteria.minUnits,
      maxUnits: newCriteria.maxUnits,
      minSqft: newCriteria.minSqft,
      maxSqft: newCriteria.maxSqft,
      isActive: newCriteria.isActive || true,
      emailNotifications: newCriteria.emailNotifications || true,
      createdAt: new Date(),
      matchCount: 0
    }

    const updated = [...criteria, criteria]
    saveCriteria(updated)
    setShowCreateDialog(false)
    setNewCriteria({
      name: "",
      location: "",
      propertyType: [],
      isActive: true,
      emailNotifications: true,
      matchCount: 0
    })
  }

  const deleteCriteria = (id: string) => {
    const updated = criteria.filter(c => c.id !== id)
    saveCriteria(updated)

    // Also remove related alerts
    const updatedAlerts = alerts.filter(a => a.criteriaId !== id)
    saveAlerts(updatedAlerts)
  }

  const toggleCriteria = (id: string) => {
    const updated = criteria.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    )
    saveCriteria(updated)
  }

  const checkForNewMatches = () => {
    // Simulate finding new properties that match criteria
    criteria.filter(c => c.isActive).forEach(criteriaItem => {
      // Generate mock matching properties for demonstration
      if (Math.random() > 0.7) { // 30% chance of new match
        generateMockAlert(criteriaItem)
      }
    })
  }

  const generateMockAlert = (criteriaItem: InvestmentCriteria) => {
    const city = SE_CITIES.find(c => c.value === criteriaItem.location)
    if (!city) return

    const randomZip = city.zipCodes[Math.floor(Math.random() * city.zipCodes.length)]
    const randomPropertyType = criteriaItem.propertyType.length > 0
      ? criteriaItem.propertyType[Math.floor(Math.random() * criteriaItem.propertyType.length)]
      : PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)]

    const mockProperty = {
      address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Elm', 'Park'][Math.floor(Math.random() * 5)]} Street`,
      city: city.label.split(',')[0],
      state: city.label.split(',')[1].trim(),
      zipCode: randomZip,
      propertyType: randomPropertyType,
      listingPrice: (criteriaItem.minPrice || 500000) + Math.floor(Math.random() * 1000000),
      capRate: (criteriaItem.minCapRate || 0.04) + Math.random() * 0.03,
      units: randomPropertyType === 'Apartment' ? 10 + Math.floor(Math.random() * 50) : undefined,
      sqft: 5000 + Math.floor(Math.random() * 20000)
    }

    const alert: PropertyAlert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      criteriaId: criteriaItem.id,
      propertyId: `prop_${Date.now()}_${Math.random()}`,
      property: mockProperty,
      matchedAt: new Date(),
      isViewed: false
    }

    const updatedAlerts = [...alerts, alert]
    saveAlerts(updatedAlerts)

    // Update criteria match count
    const updatedCriteria = criteria.map(c =>
      c.id === criteriaItem.id
        ? { ...c, matchCount: c.matchCount + 1, lastMatch: new Date() }
        : c
    )
    saveCriteria(updatedCriteria)
  }

  const markAlertAsViewed = (alertId: string) => {
    const updated = alerts.map(a =>
      a.id === alertId ? { ...a, isViewed: true } : a
    )
    saveAlerts(updated)
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
    return `${(rate * 100).toFixed(2)}%`
  }

  const unviewedAlerts = alerts.filter(a => !a.isViewed)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <span>Property Alerts</span>
          </h2>
          <p className="text-gray-600">Automated monitoring for investment opportunities in the Southeast</p>
        </div>
        <div className="flex items-center space-x-2">
          {unviewedAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unviewedAlerts.length} New
            </Badge>
          )}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Investment Alert</DialogTitle>
                <DialogDescription>
                  Set your investment criteria to receive automatic notifications
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Name</Label>
                    <Input
                      placeholder="e.g., Atlanta Apartments Under $2M"
                      value={newCriteria.name || ""}
                      onChange={(e) => setNewCriteria({...newCriteria, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={newCriteria.location || ""}
                      onValueChange={(value) => setNewCriteria({...newCriteria, location: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SE_CITIES.map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {city.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Property Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          const current = newCriteria.propertyType || []
                          const updated = current.includes(type)
                            ? current.filter(t => t !== type)
                            : [...current, type]
                          setNewCriteria({...newCriteria, propertyType: updated})
                        }}
                        className={`px-3 py-1 rounded-full text-sm border ${
                          (newCriteria.propertyType || []).includes(type)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min price"
                        value={newCriteria.minPrice || ""}
                        onChange={(e) => setNewCriteria({...newCriteria, minPrice: Number(e.target.value) || undefined})}
                      />
                      <Input
                        type="number"
                        placeholder="Max price"
                        value={newCriteria.maxPrice || ""}
                        onChange={(e) => setNewCriteria({...newCriteria, maxPrice: Number(e.target.value) || undefined})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cap Rate Range (%)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Min %"
                        value={newCriteria.minCapRate ? (newCriteria.minCapRate * 100).toFixed(1) : ""}
                        onChange={(e) => setNewCriteria({...newCriteria, minCapRate: Number(e.target.value) / 100 || undefined})}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Max %"
                        value={newCriteria.maxCapRate ? (newCriteria.maxCapRate * 100).toFixed(1) : ""}
                        onChange={(e) => setNewCriteria({...newCriteria, maxCapRate: Number(e.target.value) / 100 || undefined})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newCriteria.emailNotifications || false}
                      onCheckedChange={(checked) => setNewCriteria({...newCriteria, emailNotifications: checked})}
                    />
                    <Label>Email notifications</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createCriteria}>
                      Create Alert
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            Recent Alerts
            {unviewedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unviewedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="criteria">My Criteria ({criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Yet</h3>
                <p className="text-gray-600 mb-4">Create your first investment criteria to start receiving alerts</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {alerts
                .sort((a, b) => b.matchedAt.getTime() - a.matchedAt.getTime())
                .map((alert) => {
                  const criteriaItem = criteria.find(c => c.id === alert.criteriaId)
                  return (
                    <Card
                      key={alert.id}
                      className={`cursor-pointer transition-colors ${
                        !alert.isViewed ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => markAlertAsViewed(alert.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-600">
                                {criteriaItem?.name || 'Unknown Criteria'}
                              </span>
                              {!alert.isViewed && (
                                <Badge variant="destructive" className="text-xs">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 mb-1">
                              {alert.property.address}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {alert.property.city}, {alert.property.state} {alert.property.zipCode}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              <Badge variant="outline">{alert.property.propertyType}</Badge>
                              <span className="text-gray-600">
                                {formatCurrency(alert.property.listingPrice)}
                              </span>
                              {alert.property.capRate && (
                                <span className="text-gray-600">
                                  {formatPercentage(alert.property.capRate)} Cap Rate
                                </span>
                              )}
                              {alert.property.units && (
                                <span className="text-gray-600">
                                  {alert.property.units} units
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {alert.matchedAt.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {alert.matchedAt.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="criteria" className="space-y-4">
          {criteria.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Criteria Set</h3>
                <p className="text-gray-600 mb-4">Set up your investment criteria to start monitoring opportunities</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Criteria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {criteria.map((criteriaItem) => (
                <Card key={criteriaItem.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">{criteriaItem.name}</h3>
                          <Switch
                            checked={criteriaItem.isActive}
                            onCheckedChange={() => toggleCriteria(criteriaItem.id)}
                          />
                          {criteriaItem.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{SE_CITIES.find(c => c.value === criteriaItem.location)?.label}</span>
                          </div>

                          {criteriaItem.propertyType.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <div className="flex flex-wrap gap-1">
                                {criteriaItem.propertyType.map(type => (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-4">
                            {(criteriaItem.minPrice || criteriaItem.maxPrice) && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-4 w-4" />
                                <span>
                                  {criteriaItem.minPrice ? formatCurrency(criteriaItem.minPrice) : 'Any'} - {criteriaItem.maxPrice ? formatCurrency(criteriaItem.maxPrice) : 'Any'}
                                </span>
                              </div>
                            )}

                            {(criteriaItem.minCapRate || criteriaItem.maxCapRate) && (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>
                                  {criteriaItem.minCapRate ? formatPercentage(criteriaItem.minCapRate) : 'Any'} - {criteriaItem.maxCapRate ? formatPercentage(criteriaItem.maxCapRate) : 'Any'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          <span>Created: {criteriaItem.createdAt.toLocaleDateString()}</span>
                          <span>Matches: {criteriaItem.matchCount}</span>
                          {criteriaItem.lastMatch && (
                            <span>Last match: {criteriaItem.lastMatch.toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCriteria(criteriaItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
