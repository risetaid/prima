import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text()
    console.log('🔍 Raw webhook body:', body)

    // Try to parse as JSON
    let parsedBody
    try {
      parsedBody = JSON.parse(body)
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError)
      parsedBody = { rawBody: body, parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
    }

    // Get headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get query params
    const { searchParams } = new URL(request.url)
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    // Create debug response
    const debugInfo = {
      timestamp: new Date().toISOString(),
      wibTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      method: request.method,
      url: request.url,
      headers,
      queryParams,
      body: parsedBody,
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
    }

    console.log('📱 Webhook Debug Info:', JSON.stringify(debugInfo, null, 2))

    // Return success response (required for webhook providers)
    return NextResponse.json({
      success: true,
      message: 'Webhook received and logged',
      receivedAt: new Date().toISOString(),
      debugInfo
    }, { status: 200 })

  } catch (error) {
    console.error('❌ Webhook debug error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle GET requests for webhook verification (common for some providers)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  console.log('🔍 GET webhook verification request:', {
    url: request.url,
    params: Object.fromEntries(searchParams.entries())
  })

  // Echo back any challenge parameter (common for webhook verification)
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge')
  
  if (challenge) {
    console.log('✅ Responding to webhook challenge:', challenge)
    return new Response(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return NextResponse.json({
    message: 'PRIMA Debug Webhook - Ready to receive messages',
    endpoint: '/api/webhooks/debug-webhook',
    methods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  })
}