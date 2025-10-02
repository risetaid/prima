/**
 * Simplified Cost Management API Routes
 * Provides basic cost monitoring and limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createErrorResponse } from '@/lib/api-utils';
import { llmCostService } from '@/lib/llm-cost-service';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management - Get basic cost data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
      return createErrorResponse(
        'Unauthorized. Admin access required.',
        401,
        undefined,
        'AUTHORIZATION_ERROR'
      );
    }

    // Get basic usage statistics and limits
    const [stats, limits] = await Promise.all([
      llmCostService.getUsageStats(),
      llmCostService.checkLimits()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        limits: limits.limits,
        alerts: limits.alerts,
        allowed: limits.allowed,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to get cost data', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cost data' },
      { status: 500 }
    );
  }
}