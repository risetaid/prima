import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Test endpoint to manually trigger cron job during development
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or authenticated users
    if (process.env.NODE_ENV === 'production') {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('🧪 Manual cron test triggered')
    
    // Call the actual cron endpoint
    const baseUrl = process.env.NEXTJS_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()
    
    return NextResponse.json({
      message: 'Cron job test completed',
      result
    })

  } catch (error) {
    console.error('❌ Cron test failed:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}