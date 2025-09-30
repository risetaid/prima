import { NextRequest, NextResponse } from 'next/server';
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service';

import { logger } from '@/lib/logger';
const notificationService = new VolunteerNotificationService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const body = await request.json();
    const { response } = body;

    if (!response || !response.trim()) {
      return NextResponse.json(
        { success: false, error: 'Response is required' },
        { status: 400 }
      );
    }

    const notification = await notificationService.markAsResponded(
      notificationId,
      response
    );

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: unknown) {
    logger.error('Failed to respond to notification:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to respond to notification' },
      { status: 500 }
    );
  }
}