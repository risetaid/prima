import { NextRequest, NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhook-store'

export async function GET(request: NextRequest) {
  try {
    const logs = webhookStore.getLogs()
    
    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error fetching webhook logs:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch logs',
      logs: [],
      count: 0
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    webhookStore.clearLogs()
    
    return NextResponse.json({
      success: true,
      message: 'Logs cleared',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error clearing webhook logs:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clear logs'
    }, { status: 500 })
  }
}