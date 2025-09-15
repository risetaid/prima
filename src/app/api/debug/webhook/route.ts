import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Debug endpoint to capture ALL webhook traffic from Fonnte
 * This helps us understand the exact format of webhook payloads
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  // Capture all headers
  const headers = Object.fromEntries(request.headers.entries())
  
  // Capture URL and query parameters  
  const url = new URL(request.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())
  
  // Parse body in multiple ways to ensure we capture everything
  let body: Record<string, unknown> = {}
  let rawBody = ''
  const contentType = request.headers.get('content-type') || ''
  
  try {
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      rawBody = await request.text()
      try {
        body = JSON.parse(rawBody)
      } catch {
        body = { rawText: rawBody }
      }
    }
  } catch (error) {
    logger.error('Failed to parse webhook body', error as Error)
    body = { parseError: (error as Error).message }
  }

  // Log everything for analysis
  logger.info('DEBUG WEBHOOK CAPTURE', {
    timestamp,
    method: request.method,
    url: request.url,
    headers,
    queryParams,
    contentType,
    bodyKeys: Object.keys(body || {}),
    body,
    rawBody: rawBody || undefined,
    // Message analysis
    messageAnalysis: {
      hasMessage: Boolean(body.message || body.text || body.body),
      sender: body.sender || body.phone || body.from,
      messageType: determineMessageType(body)
    }
  })

  // Always return success to not interfere with Fonnte delivery
  return NextResponse.json({ 
    ok: true, 
    captured: true, 
    timestamp,
    message: 'Webhook captured for debugging'
  })
}

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    endpoint: 'webhook-debug',
    purpose: 'Capture all webhook traffic for analysis',
    timestamp: new Date().toISOString()
  })
}

function determineMessageType(body: Record<string, unknown>): string {
  if (body.message || body.text || body.body) {
    return 'text_message'
  }
  return 'unknown'
}