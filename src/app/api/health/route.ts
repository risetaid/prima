import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const redisConnected = redis.isConnected()

    const overallStatus = redisConnected ? 'healthy' : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      cache: {
        status: redisConnected ? 'healthy' : 'degraded',
        message: redisConnected ? 'Cache operational' : 'Cache unavailable'
      },
      redis: {
        status: redisConnected ? 'healthy' : 'degraded',
        message: redisConnected ? 'Redis connected' : 'Redis not available'
      }
    })
  } catch (error: unknown) {
    logger.error('Health check error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 500 })
  }
}