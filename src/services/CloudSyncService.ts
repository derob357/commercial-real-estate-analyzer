import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  created_at: Date
  updated_at: Date
}

interface SyncedInvestmentCriteria {
  id: string
  user_id: string
  name: string
  location: string
  property_type: string[]
  min_cap_rate?: number
  max_cap_rate?: number
  min_price?: number
  max_price?: number
  min_units?: number
  max_units?: number
  min_sqft?: number
  max_sqft?: number
  is_active: boolean
  email_notifications: boolean
  created_at: Date
  updated_at: Date
  match_count: number
  last_match?: Date
}

interface SyncedPortfolioProperty {
  id: string
  user_id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  property_type: string
  purchase_date: Date
  purchase_price: number
  current_value: number
  initial_cap_rate: number
  current_cap_rate: number
  units?: number
  sqft: number
  gross_income: number
  expenses: number
  noi: number
  cash_flow: number
  total_return: number
  equity_invested: number
  loan_amount?: number
  notes?: string
  created_at: Date
  updated_at: Date
}

interface SyncedPropertyAlert {
  id: string
  user_id: string
  criteria_id: string
  property_data: Record<string, any>
  matched_at: Date
  is_viewed: boolean
  created_at: Date
}

interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at'>>
      }
      investment_criteria: {
        Row: SyncedInvestmentCriteria
        Insert: Omit<SyncedInvestmentCriteria, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SyncedInvestmentCriteria, 'id' | 'user_id' | 'created_at'>>
      }
      portfolio_properties: {
        Row: SyncedPortfolioProperty
        Insert: Omit<SyncedPortfolioProperty, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SyncedPortfolioProperty, 'id' | 'user_id' | 'created_at'>>
      }
      property_alerts: {
        Row: SyncedPropertyAlert
        Insert: Omit<SyncedPropertyAlert, 'id' | 'created_at'>
        Update: Partial<Omit<SyncedPropertyAlert, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}

export class CloudSyncService {
  private supabase: SupabaseClient<Database>
  private static instance: CloudSyncService
  private isInitialized = false

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService()
    }
    return CloudSyncService.instance
  }

  async initialize(userId: string, email: string): Promise<void> {
    if (this.isInitialized) return

    try {
      // Ensure user profile exists
      await this.ensureUserProfile(userId, email)
      this.isInitialized = true
      console.log('✅ Cloud sync initialized')
    } catch (error) {
      console.error('❌ Failed to initialize cloud sync:', error)
      throw error
    }
  }

  private async ensureUserProfile(userId: string, email: string): Promise<UserProfile> {
    // Check if profile exists
    const { data: existingProfile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingProfile) {
      return existingProfile
    }

    // Create new profile
    const { data: newProfile, error } = await this.supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email,
        subscription_tier: 'free'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`)
    }

    return newProfile
  }

  // Investment Criteria Sync
  async syncInvestmentCriteria(userId: string, localCriteria: any[]): Promise<SyncedInvestmentCriteria[]> {
    try {
      // Get cloud criteria
      const { data: cloudCriteria, error: fetchError } = await this.supabase
        .from('investment_criteria')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) {
        throw new Error(`Failed to fetch criteria: ${fetchError.message}`)
      }

      // Merge local and cloud data
      const mergedCriteria = await this.mergeInvestmentCriteria(userId, localCriteria, cloudCriteria || [])

      return mergedCriteria
    } catch (error) {
      console.error('Error syncing investment criteria:', error)
      throw error
    }
  }

  private async mergeInvestmentCriteria(
    userId: string,
    localCriteria: any[],
    cloudCriteria: SyncedInvestmentCriteria[]
  ): Promise<SyncedInvestmentCriteria[]> {
    const cloudMap = new Map(cloudCriteria.map(c => [c.id, c]))
    const toUpdate: SyncedInvestmentCriteria[] = []
    const toInsert: any[] = []

    // Process local criteria
    for (const local of localCriteria) {
      const cloud = cloudMap.get(local.id)

      if (cloud) {
        // Check if local is newer
        const localUpdated = new Date(local.updatedAt || local.createdAt)
        const cloudUpdated = new Date(cloud.updated_at)

        if (localUpdated > cloudUpdated) {
          toUpdate.push({
            ...cloud,
            name: local.name,
            location: local.location,
            property_type: local.propertyType,
            min_cap_rate: local.minCapRate,
            max_cap_rate: local.maxCapRate,
            min_price: local.minPrice,
            max_price: local.maxPrice,
            min_units: local.minUnits,
            max_units: local.maxUnits,
            min_sqft: local.minSqft,
            max_sqft: local.maxSqft,
            is_active: local.isActive,
            email_notifications: local.emailNotifications,
            match_count: local.matchCount,
            last_match: local.lastMatch,
            updated_at: new Date()
          })
        }
        cloudMap.delete(local.id)
      } else {
        // New local item
        toInsert.push({
          id: local.id,
          user_id: userId,
          name: local.name,
          location: local.location,
          property_type: local.propertyType,
          min_cap_rate: local.minCapRate,
          max_cap_rate: local.maxCapRate,
          min_price: local.minPrice,
          max_price: local.maxPrice,
          min_units: local.minUnits,
          max_units: local.maxUnits,
          min_sqft: local.minSqft,
          max_sqft: local.maxSqft,
          is_active: local.isActive,
          email_notifications: local.emailNotifications,
          match_count: local.matchCount,
          last_match: local.lastMatch
        })
      }
    }

    // Update existing items
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        await this.supabase
          .from('investment_criteria')
          .update(item)
          .eq('id', item.id)
      }
    }

    // Insert new items
    if (toInsert.length > 0) {
      await this.supabase
        .from('investment_criteria')
        .insert(toInsert)
    }

    // Get final merged result
    const { data: finalCriteria } = await this.supabase
      .from('investment_criteria')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return finalCriteria || []
  }

  async saveInvestmentCriteria(userId: string, criteria: any): Promise<void> {
    const syncedCriteria = {
      id: criteria.id,
      user_id: userId,
      name: criteria.name,
      location: criteria.location,
      property_type: criteria.propertyType,
      min_cap_rate: criteria.minCapRate,
      max_cap_rate: criteria.maxCapRate,
      min_price: criteria.minPrice,
      max_price: criteria.maxPrice,
      min_units: criteria.minUnits,
      max_units: criteria.maxUnits,
      min_sqft: criteria.minSqft,
      max_sqft: criteria.maxSqft,
      is_active: criteria.isActive,
      email_notifications: criteria.emailNotifications,
      match_count: criteria.matchCount,
      last_match: criteria.lastMatch
    }

    const { error } = await this.supabase
      .from('investment_criteria')
      .upsert(syncedCriteria)

    if (error) {
      throw new Error(`Failed to save criteria: ${error.message}`)
    }
  }

  async deleteInvestmentCriteria(userId: string, criteriaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('investment_criteria')
      .delete()
      .eq('user_id', userId)
      .eq('id', criteriaId)

    if (error) {
      throw new Error(`Failed to delete criteria: ${error.message}`)
    }
  }

  // Portfolio Properties Sync
  async syncPortfolioProperties(userId: string, localProperties: any[]): Promise<SyncedPortfolioProperty[]> {
    try {
      const { data: cloudProperties, error: fetchError } = await this.supabase
        .from('portfolio_properties')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) {
        throw new Error(`Failed to fetch properties: ${fetchError.message}`)
      }

      const mergedProperties = await this.mergePortfolioProperties(userId, localProperties, cloudProperties || [])
      return mergedProperties
    } catch (error) {
      console.error('Error syncing portfolio properties:', error)
      throw error
    }
  }

  private async mergePortfolioProperties(
    userId: string,
    localProperties: any[],
    cloudProperties: SyncedPortfolioProperty[]
  ): Promise<SyncedPortfolioProperty[]> {
    const cloudMap = new Map(cloudProperties.map(p => [p.id, p]))
    const toUpdate: SyncedPortfolioProperty[] = []
    const toInsert: any[] = []

    for (const local of localProperties) {
      const cloud = cloudMap.get(local.id)

      if (cloud) {
        // Update if local is newer
        const localUpdated = new Date(local.updatedAt || local.createdAt || Date.now())
        const cloudUpdated = new Date(cloud.updated_at)

        if (localUpdated > cloudUpdated) {
          toUpdate.push({
            ...cloud,
            name: local.name,
            address: local.address,
            city: local.city,
            state: local.state,
            zip_code: local.zipCode,
            property_type: local.propertyType,
            purchase_date: new Date(local.purchaseDate),
            purchase_price: local.purchasePrice,
            current_value: local.currentValue,
            initial_cap_rate: local.initialCapRate,
            current_cap_rate: local.currentCapRate,
            units: local.units,
            sqft: local.sqft,
            gross_income: local.grossIncome,
            expenses: local.expenses,
            noi: local.noi,
            cash_flow: local.cashFlow,
            total_return: local.totalReturn,
            equity_invested: local.equityInvested,
            loan_amount: local.loanAmount,
            notes: local.notes,
            updated_at: new Date()
          })
        }
        cloudMap.delete(local.id)
      } else {
        toInsert.push({
          id: local.id,
          user_id: userId,
          name: local.name,
          address: local.address,
          city: local.city,
          state: local.state,
          zip_code: local.zipCode,
          property_type: local.propertyType,
          purchase_date: new Date(local.purchaseDate),
          purchase_price: local.purchasePrice,
          current_value: local.currentValue,
          initial_cap_rate: local.initialCapRate,
          current_cap_rate: local.currentCapRate,
          units: local.units,
          sqft: local.sqft,
          gross_income: local.grossIncome,
          expenses: local.expenses,
          noi: local.noi,
          cash_flow: local.cashFlow,
          total_return: local.totalReturn,
          equity_invested: local.equityInvested,
          loan_amount: local.loanAmount,
          notes: local.notes
        })
      }
    }

    // Execute updates and inserts
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        await this.supabase
          .from('portfolio_properties')
          .update(item)
          .eq('id', item.id)
      }
    }

    if (toInsert.length > 0) {
      await this.supabase
        .from('portfolio_properties')
        .insert(toInsert)
    }

    const { data: finalProperties } = await this.supabase
      .from('portfolio_properties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return finalProperties || []
  }

  async savePortfolioProperty(userId: string, property: any): Promise<void> {
    const syncedProperty = {
      id: property.id,
      user_id: userId,
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zip_code: property.zipCode,
      property_type: property.propertyType,
      purchase_date: new Date(property.purchaseDate),
      purchase_price: property.purchasePrice,
      current_value: property.currentValue,
      initial_cap_rate: property.initialCapRate,
      current_cap_rate: property.currentCapRate,
      units: property.units,
      sqft: property.sqft,
      gross_income: property.grossIncome,
      expenses: property.expenses,
      noi: property.noi,
      cash_flow: property.cashFlow,
      total_return: property.totalReturn,
      equity_invested: property.equityInvested,
      loan_amount: property.loanAmount,
      notes: property.notes
    }

    const { error } = await this.supabase
      .from('portfolio_properties')
      .upsert(syncedProperty)

    if (error) {
      throw new Error(`Failed to save property: ${error.message}`)
    }
  }

  // Property Alerts Sync
  async syncPropertyAlerts(userId: string, localAlerts: any[]): Promise<SyncedPropertyAlert[]> {
    try {
      const { data: cloudAlerts, error } = await this.supabase
        .from('property_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('matched_at', { ascending: false })
        .limit(100) // Limit to recent alerts

      if (error) {
        throw new Error(`Failed to fetch alerts: ${error.message}`)
      }

      return cloudAlerts || []
    } catch (error) {
      console.error('Error syncing property alerts:', error)
      return []
    }
  }

  async savePropertyAlert(userId: string, alert: any): Promise<void> {
    const syncedAlert = {
      id: alert.id,
      user_id: userId,
      criteria_id: alert.criteriaId,
      property_data: alert.property,
      matched_at: new Date(alert.matchedAt),
      is_viewed: alert.isViewed
    }

    const { error } = await this.supabase
      .from('property_alerts')
      .upsert(syncedAlert)

    if (error) {
      throw new Error(`Failed to save alert: ${error.message}`)
    }
  }

  // Real-time subscriptions
  subscribeToUserData(userId: string, callback: (event: any) => void): () => void {
    const channels = [
      this.supabase
        .channel('investment_criteria_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'investment_criteria', filter: `user_id=eq.${userId}` },
          callback
        ),
      this.supabase
        .channel('portfolio_properties_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'portfolio_properties', filter: `user_id=eq.${userId}` },
          callback
        ),
      this.supabase
        .channel('property_alerts_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'property_alerts', filter: `user_id=eq.${userId}` },
          callback
        )
    ]

    channels.forEach(channel => channel.subscribe())

    return () => {
      channels.forEach(channel => this.supabase.removeChannel(channel))
    }
  }

  // Utility methods
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date() })
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }
  }

  getConnectionStatus(): boolean {
    return this.isInitialized
  }
}
