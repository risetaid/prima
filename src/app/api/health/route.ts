import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const checks = {
      redis: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown', latency: 0, message: '' },
      database: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown', latency: 0, message: '' },
    }

    // Test Redis with latency measurement
    try {
      const start = Date.now()
      const pingResult = await redis.ping()
      const latency = Date.now() - start
      
      if (pingResult.success) {
        checks.redis = {
          status: 'healthy',
          latency,
          message: 'Redis connected and responding'
        }
      } else {
        checks.redis = {
          status: 'unhealthy',
          latency,
          message: 'Redis ping failed'
        }
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        latency: 0,
        message: error instanceof Error ? error.message : 'Redis connection failed'
      }
    }

    // Test Database with latency measurement
    try {
      const start = Date.now()
      await db.execute(sql`SELECT 1`)
      const latency = Date.now() - start
      
      checks.database = {
        status: 'healthy',
        latency,
        message: 'Database connected and responding'
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        latency: 0,
        message: error instanceof Error ? error.message : 'Database connection failed'
      }
    }

    // Determine overall status
    const overallStatus = 
      checks.redis.status === 'healthy' && checks.database.status === 'healthy'
        ? 'healthy' 
        : checks.redis.status === 'unhealthy' || checks.database.status === 'unhealthy'
        ? 'unhealthy'
        : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      info: {
        plan: 'Railway Pro',
        environment: process.env.NODE_ENV || 'unknown',
        region: process.env.RAILWAY_REGION || 'unknown',
      }
    })
  } catch (error: unknown) {
    logger.error('Health check error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
