/**
 * Cost Management API Routes
 * Provides endpoints for cost monitoring, analytics, and optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedCostManager } from '@/lib/enhanced-cost-manager';
import { costMonitor } from '@/lib/cost-monitor';
import { costOptimizer } from '@/lib/cost-optimizer';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management/dashboard - Get cost dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Parse period
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get comprehensive dashboard data
    const dashboard = await enhancedCostManager.getCostDashboard();

    // Get monitoring dashboard
    const monitoring = await costMonitor.getMonitoringDashboard();

    // Get optimization recommendations
    const recommendations = await costOptimizer.getCostSavingRecommendations();

    return NextResponse.json({
      success: true,
      data: {
        period: { start: startDate, end: endDate },
        dashboard,
        monitoring,
        recommendations,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to get cost dashboard', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cost dashboard' },
      { status: 500 }
    );
  }
}