/**
 * Simplified Cost Optimization API
 * Provides basic cost information for optimization display
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createErrorResponse } from '@/lib/api-utils';
import { llmCostService } from '@/lib/llm-cost-service';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management/optimization - Get basic cost info
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

    // Get basic usage statistics
    const stats = await llmCostService.getUsageStats();

    // Simple optimization suggestions based on usage
    const suggestions = [];

    if (stats.dailyTokens > 10000) {
      suggestions.push("Consider implementing response caching for frequent queries");
    }

    if (stats.monthlyTokens > 500000) {
      suggestions.push("High monthly usage detected. Consider optimizing prompts or using smaller models.");
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        suggestions,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to get cost info', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cost info' },
      { status: 500 }
    );
  }
}