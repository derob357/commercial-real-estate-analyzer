import { DatabaseUtils } from './database'
import { initializeJobSystem } from './jobs/scrape-queue'

export async function initializeBackend(): Promise<void> {
  console.log('Initializing Real Estate Analyzer backend...')

  try {
    // 1. Check database connection
    console.log('Checking database connection...')
    const dbConnected = await DatabaseUtils.ensureConnection()
    if (!dbConnected) {
      throw new Error('Database connection failed')
    }
    console.log('✓ Database connection established')

    // 2. Initialize job system
    console.log('Initializing job system...')
    await initializeJobSystem()
    console.log('✓ Job system initialized')

    console.log('Backend initialization complete!')

  } catch (error) {
    console.error('Backend initialization failed:', error)
    throw error
  }
}

// Health check function
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  checks: {
    database: boolean
    timestamp: Date
  }
}> {
  const checks = {
    database: await DatabaseUtils.ensureConnection(),
    timestamp: new Date()
  }

  const allHealthy = Object.values(checks).filter(v => typeof v === 'boolean').every(Boolean)

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  }
}