/**
 * Conversation Cost API
 * Get detailed cost information for a specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedCostManager } from '@/lib/enhanced-cost-manager';
import { logger } from '@/lib/logger';

// GET /api/admin/cost-management/conversation/[id] - Get conversation cost summary
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const costSummary = await enhancedCostManager.getConversationCostSummary(
      conversationId,
      startDate,
      endDate
    );

    if (!costSummary) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or no cost data available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: costSummary
    });
   } catch (error) {
    logger.error('Failed to get conversation cost summary', error as Error, { conversationId });
    return NextResponse.json(
      { success: false, error: 'Failed to get conversation cost summary' },
      { status: 500 }
    );
  }
}