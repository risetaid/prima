import { NextRequest, NextResponse } from 'next/server'
import { llmAnalytics } from '@/lib/llm-analytics'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Parse dates if provided
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    // Get usage statistics
    const stats = await llmAnalytics.getUsageStats(start, end)

    // Get alerts
    const alerts = await llmAnalytics.checkAlerts()

    // Get optimization recommendations
    const recommendations = await llmAnalytics.getOptimizationRecommendations()

    return NextResponse.json({
      stats,
      alerts,
      recommendations,
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
      case 'clear_cache':
        // This would require implementing a cache clearing method
        return NextResponse.json({ message: 'Cache clearing not implemented yet' })

      case 'optimize_prompts':
        const recommendations = await llmAnalytics.getOptimizationRecommendations()
        return NextResponse.json({ recommendations })

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