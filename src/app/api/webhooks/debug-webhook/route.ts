import { NextRequest, NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhook-store'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testMode = searchParams.get('test') === 'true'
  
  if (testMode) {
    return await handleTestWebhook(request)
  }
  try {
    // Get raw body
    const body = await request.text()

    // Try to parse as JSON
    let parsedBody
    try {
      parsedBody = JSON.parse(body)
    } catch (parseError) {
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

    // Extract Fonnte webhook data if available
    let fonnteData = null
    if (parsedBody && typeof parsedBody === 'object') {
      // Check if this looks like a Fonnte webhook
      if (parsedBody.device || parsedBody.sender || parsedBody.message) {
        fonnteData = {
          device: parsedBody.device || 'Unknown',
          sender: parsedBody.sender || 'Unknown',
          message: parsedBody.message || '',
          member: parsedBody.member || null, // for group messages
          name: parsedBody.name || 'Unknown',
          location: parsedBody.location || null,
          messageType: 'text', // default
          provider: 'fonnte'
        }
      }
    }

    // Create debug response
    const debugInfo = {
      timestamp: new Date().toISOString(),
      wibTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      method: request.method,
      url: request.url,
      headers,
      queryParams,
      rawBody: parsedBody,
      fonnteData,
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
    }

    // Also log to help with debugging
    
    // Force log to Vercel logs
    if (fonnteData) {
      
      // Store in webhook store
      const storedLog = webhookStore.addLog(fonnteData)
    } else {
      
      // Store raw data anyway for debugging
      webhookStore.addLog({
        rawData: parsedBody,
        provider: 'unknown',
        message: 'Raw webhook data (not Fonnte format)',
        receivedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      })
    }

    // Return success response (required for webhook providers)
    return NextResponse.json({
      success: true,
      message: 'Webhook received and logged',
      receivedAt: new Date().toISOString(),
      debugInfo
    }, { status: 200 })

  } catch (error) {
    
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
  const action = searchParams.get('action')
  
  if (action === 'logs') {
    return await handleWebhookLogs()
  } else if (action === 'clear') {
    return await clearWebhookLogs()
  }

  // Echo back any challenge parameter (common for webhook verification)
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge')
  
  if (challenge) {
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

async function handleTestWebhook(request: NextRequest) {
  try {
    const mockFonnteData = {
      device: '628594257362',
      sender: '6281333852187',
      message: 'TEST dari webhook',
      member: null,
      name: 'Test User',
      location: null
    }

    const fonnteData = {
      device: mockFonnteData.device || 'Unknown',
      sender: mockFonnteData.sender || 'Unknown',
      message: mockFonnteData.message || '',
      member: mockFonnteData.member || null,
      name: mockFonnteData.name || 'Unknown',
      location: mockFonnteData.location || null,
      messageType: 'text',
      provider: 'fonnte'
    }

    const storedLog = webhookStore.addLog(fonnteData)

    return NextResponse.json({
      success: true,
      message: 'Test webhook processed successfully',
      mockData: mockFonnteData,
      storedLogId: storedLog.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleWebhookLogs() {
  try {
    const logs = webhookStore.getLogs()
    
    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch logs',
      logs: [],
      count: 0
    }, { status: 500 })
  }
}

async function clearWebhookLogs() {
  try {
    webhookStore.clearLogs()
    
    return NextResponse.json({
      success: true,
      message: 'Logs cleared',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to clear logs'
    }, { status: 500 })
  }
}