import { NextRequest, NextResponse } from 'next/server'
import { llmCostService } from '@/lib/llm-cost-service'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Get basic usage statistics and limits
    const [stats, limits] = await Promise.all([
      llmCostService.getUsageStats(),
      llmCostService.checkLimits()
    ])

    return NextResponse.json({
      stats,
      limits: limits.limits,
      alerts: limits.alerts,
      allowed: limits.allowed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to fetch LLM analytics', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'reset_daily':
        // Simple daily reset (for testing)
        return NextResponse.json({ message: 'Daily reset not needed (auto-reset daily)' })

      case 'reset_monthly':
        // Simple monthly reset (for testing)
        return NextResponse.json({ message: 'Monthly reset not needed (auto-reset monthly)' })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Failed to process LLM analytics action', error as Error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}