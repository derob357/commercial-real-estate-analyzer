import { type NextRequest, NextResponse } from 'next/server'
import { healthCheck } from '@/lib/init'

export async function GET(request: NextRequest) {
  try {
    const health = await healthCheck()
    
    const statusCode = health.status === 'healthy' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        checks: {
          database: false,
          timestamp: new Date()
        }
      },
      { status: 503 }
    )
  }
}