import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(request: Request) {
  // Security: Only allow in development or with secret
  const authHeader = request.headers.get('authorization')
  const isDev = process.env.NODE_ENV === 'development'
  const hasSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`
  
  if (!isDev && !hasSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const diagnostics = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasRedisUrl: !!process.env.REDIS_URL,
        hasKvUrl: !!process.env.KV_URL,
        redisUrlFormat: process.env.REDIS_URL 
          ? process.env.REDIS_URL.substring(0, 20) + '...' 
          : 'not set',
      },
      client: {
        status: redis.getStatus(),
        isConnected: redis.isConnected(),
      },
      tests: {
        ping: { success: false, latency: 0, error: '' },
        set: { success: false, error: '' },
        get: { success: false, error: '' },
      }
    }

    // Test ping
    try {
      const pingResult = await redis.ping()
      diagnostics.tests.ping = {
        success: pingResult.success,
        latency: pingResult.latency,
        error: pingResult.success ? '' : 'Ping returned false'
      }
    } catch (error) {
      diagnostics.tests.ping.error = error instanceof Error ? error.message : String(error)
    }

    // Test set
    try {
      const setResult = await redis.set('debug_test', 'ok', 10)
      diagnostics.tests.set = {
        success: setResult,
        error: setResult ? '' : 'Set returned false'
      }
    } catch (error) {
      diagnostics.tests.set.error = error instanceof Error ? error.message : String(error)
    }

    // Test get
    try {
      const getValue = await redis.get('debug_test')
      diagnostics.tests.get = {
        success: getValue === 'ok',
        error: getValue === 'ok' ? '' : `Expected 'ok', got: ${getValue}`
      }
      await redis.del('debug_test')
    } catch (error) {
      diagnostics.tests.get.error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
