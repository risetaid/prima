import { NextResponse } from 'next/server'
import Redis from 'ioredis'

export async function GET(request: Request) {
  // Security: Only allow with secret
  const authHeader = request.headers.get('authorization')
  const hasSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`
  
  if (!hasSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const testUrl = url.searchParams.get('url')
  
  if (!testUrl) {
    return NextResponse.json({ 
      error: 'Missing url parameter',
      usage: '/api/debug/redis-custom?url=redis://...'
    }, { status: 400 })
  }

  let testClient: Redis | null = null
  const results = {
    testUrl: testUrl.substring(0, 50) + '...',
    connection: {
      attempted: false,
      connected: false,
      error: '',
      status: 'unknown'
    },
    ping: {
      success: false,
      latency: 0,
      error: ''
    }
  }

  try {
    results.connection.attempted = true
    
    // Try to connect
    testClient = new Redis(testUrl, {
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })

    // Set up event handlers
    testClient.on('error', (err) => {
      results.connection.error = err.message
    })

    // Try to connect
    await testClient.connect()
    results.connection.connected = true
    results.connection.status = testClient.status

    // Try ping
    const start = Date.now()
    await testClient.ping()
    results.ping.latency = Date.now() - start
    results.ping.success = true

  } catch (error) {
    results.connection.error = error instanceof Error ? error.message : String(error)
    results.ping.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (testClient) {
      try {
        await testClient.quit()
      } catch {}
    }
  }

  return NextResponse.json(results)
}
