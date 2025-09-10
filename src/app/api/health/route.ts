import { NextResponse } from 'next/server'
import { getCacheHealthStatus, getRedisHealthStatus } from '@/lib/cache'

export async function GET() {
  try {
    const cacheHealth = await getCacheHealthStatus()
    const redisHealth = getRedisHealthStatus()

    const overallStatus = (cacheHealth.redis && redisHealth.connected) ? 'healthy' : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      cache: {
        status: cacheHealth.redis ? 'healthy' : 'degraded',
        message: cacheHealth.message,
        operations: cacheHealth.cacheOperations,
        lastError: cacheHealth.lastError
      },
      redis: {
        status: redisHealth.connected ? 'healthy' : 'degraded',
        message: redisHealth.message
      },
      recommendations: getHealthRecommendations(cacheHealth, redisHealth)
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown health check error'
    }, { status: 500 })
  }
}

function getHealthRecommendations(cacheHealth: any, redisHealth: any): string[] {
  const recommendations: string[] = []

  if (!redisHealth.connected) {
    recommendations.push('Redis connection is down - cache operations will fail gracefully')
    recommendations.push('Check Redis server status and network connectivity')
  }

  if (!cacheHealth.redis) {
    recommendations.push('Cache operations are failing - system will use database directly')
    recommendations.push('Check Redis configuration and connection settings')
  }

  if (!cacheHealth.cacheOperations.set) {
    recommendations.push('Cache SET operations failing - new data won\'t be cached')
  }

  if (!cacheHealth.cacheOperations.get) {
    recommendations.push('Cache GET operations failing - will always hit database')
  }

  if (!cacheHealth.cacheOperations.del) {
    recommendations.push('Cache invalidation failing - stale data may persist')
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operational - cache working optimally')
  }

  return recommendations
}