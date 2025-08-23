import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Simulate Fonnte webhook data
    const mockFonnteData = {
      device: '628594257362',
      sender: '6281333852187',
      message: 'TEST dari webhook',
      member: null,
      name: 'Test User',
      location: null
    }

    console.log('🧪 TEST WEBHOOK TRIGGERED:', JSON.stringify(mockFonnteData, null, 2))

    // Forward to debug webhook
    const debugResponse = await fetch(`${new URL(request.url).origin}/api/webhooks/debug-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockFonnteData)
    })

    const debugResult = await debugResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent to debug endpoint',
      mockData: mockFonnteData,
      debugResponse: debugResult
    })

  } catch (error) {
    console.error('❌ Test webhook error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test webhook endpoint ready',
    testUrl: `${new URL(request.url).origin}/api/webhooks/test-webhook`,
    debugUrl: `${new URL(request.url).origin}/api/webhooks/debug-webhook`,
    timestamp: new Date().toISOString()
  })
}