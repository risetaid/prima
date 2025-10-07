import { createApiHandler } from '@/lib/api-helpers'
import { redis } from '@/lib/redis'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

// GET /api/health - Health check endpoint for system monitoring
export const GET = createApiHandler(
  { auth: "optional" }, // Health check should be accessible without auth
  async () => {
    const checks = {
      redis: { 
        status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown' | 'degraded', 
        latency: 0, 
        message: '',
        circuitBreaker: undefined as ReturnType<typeof redis.getStatus>['circuitBreaker']
      },
      database: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown', latency: 0, message: '' },
    }

    // Test Redis with latency measurement
    try {
      const start = Date.now()
      const pingResult = await redis.ping()
      const latency = Date.now() - start
      
      // Get Redis status including circuit breaker
      const redisStatus = redis.getStatus()
      
      if (pingResult.success) {
        let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
        let message = 'Redis connected and responding'
        
        // Check circuit breaker state
        if (redisStatus.circuitBreaker) {
          if (redisStatus.circuitBreaker.isOpen) {
            status = 'unhealthy'
            message = 'Redis circuit breaker is OPEN'
          } else if (redisStatus.circuitBreaker.isHalfOpen) {
            status = 'degraded'
            message = 'Redis circuit breaker is HALF-OPEN (testing recovery)'
          } else if (redisStatus.circuitBreaker.failureCount > 0) {
            status = 'degraded'
            message = `Redis recovering (${redisStatus.circuitBreaker.failureCount} recent failures)`
          }
        }
        
        checks.redis = {
          status,
          latency,
          message,
          circuitBreaker: redisStatus.circuitBreaker
        }
      } else {
        checks.redis = {
          status: 'unhealthy',
          latency,
          message: 'Redis ping failed',
          circuitBreaker: redisStatus.circuitBreaker
        }
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        latency: 0,
        message: error instanceof Error ? error.message : 'Redis connection failed',
        circuitBreaker: redis.getStatus().circuitBreaker
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

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      info: {
        plan: 'Railway Pro',
        environment: process.env.NODE_ENV || 'unknown',
        region: process.env.RAILWAY_REGION || 'unknown',
      }
    };
  }
);
