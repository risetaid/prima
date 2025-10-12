import { NextRequest, NextResponse } from 'next/server'

export function requireWebhookToken(request: NextRequest): NextResponse | null {
  const url = new URL(request.url)
  
  // Try to get token from multiple sources
  // 1. Query parameter ?token=xxx
  const queryToken = url.searchParams.get('token')
  
  // 2. Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  
  // 3. X-Webhook-Token header
  const headerToken = request.headers.get('x-webhook-token')
  
  const token = queryToken || bearerToken || headerToken
  const expected = process.env.WEBHOOK_TOKEN || ''

  // If no token configured, allow all requests
  // This makes it compatible with Fonnte which doesn't support auth
  if (!expected) {
    console.log('⚠️ WEBHOOK_TOKEN not configured - allowing unauthenticated webhook')
    return null
  }

  // If token is provided, validate it
  if (token && token === expected) {
    return null
  }
  
  // For Fonnte compatibility: If no token provided but WEBHOOK_TOKEN exists,
  // check if ALLOW_UNSIGNED_WEBHOOKS is enabled
  if (!token && process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true') {
    console.log('⚠️ Allowing unsigned webhook (ALLOW_UNSIGNED_WEBHOOKS=true)')
    return null
  }

  // Token mismatch or missing
  console.log('❌ Webhook authentication failed', {
    hasQueryToken: !!queryToken,
    hasBearerToken: !!bearerToken,
    hasHeaderToken: !!headerToken,
    hasExpected: !!expected
  })
  
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
