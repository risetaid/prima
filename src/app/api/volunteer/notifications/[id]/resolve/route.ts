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

    const notification = await notificationService.resolveNotification(notificationId);

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: unknown) {
    logger.error('Failed to resolve notification:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to resolve notification' },
      { status: 500 }
    );
  }
}