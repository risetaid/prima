import { NextRequest, NextResponse } from 'next/server'

export function requireWebhookToken(request: NextRequest): NextResponse | null {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const expected = process.env.WEBHOOK_TOKEN || ''

  // If no token configured, allow requests (less secure, but compatible with providers that can't add secrets)
  if (!expected) return null

  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
