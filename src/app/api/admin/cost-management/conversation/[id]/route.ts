/**
 * Simplified Conversation Cost API
 * Returns basic cost tracking information (conversation cost tracking removed for simplicity)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createErrorResponse } from '@/lib/api-utils';
import { llmCostService } from '@/lib/llm-cost-service';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management/conversation/[id] - Get basic cost info
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;

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

    // Return basic usage statistics instead of detailed conversation costs
    const stats = await llmCostService.getUsageStats();

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        message: "Conversation cost tracking simplified. See global usage stats.",
        globalStats: stats,
        note: "Individual conversation cost tracking has been removed to reduce complexity."
      }
    });
   } catch (error) {
    logger.error('Failed to get cost info', error as Error, { conversationId });
    return NextResponse.json(
      { success: false, error: 'Failed to get cost info' },
      { status: 500 }
    );
  }
}