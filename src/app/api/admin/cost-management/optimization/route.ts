/**
 * Cost Optimization API
 * Provides endpoints for cost optimization analysis and implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { costOptimizer } from '@/lib/cost-optimizer';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management/optimization - Get optimization report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'recommendations') {
      // Get cost-saving recommendations
      const recommendations = await costOptimizer.getCostSavingRecommendations();
      return NextResponse.json({
        success: true,
        data: recommendations
      });
    } else {
      // Get full optimization report
      const report = await costOptimizer.generateOptimizationReport();
      return NextResponse.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    logger.error('Failed to get optimization data', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to get optimization data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/cost-management/optimization - Apply optimization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { optimizationId } = body;

    if (!optimizationId) {
      return NextResponse.json(
        { success: false, error: 'Optimization ID is required' },
        { status: 400 }
      );
    }

    const success = await costOptimizer.applyOptimization(optimizationId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Optimization applied successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to apply optimization' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Failed to apply optimization', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply optimization' },
      { status: 500 }
    );
  }
}