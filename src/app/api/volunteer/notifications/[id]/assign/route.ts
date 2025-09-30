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

    // TODO: Get current user ID from authentication
    const volunteerId = 'current-user-id'; // Placeholder

    const notification = await notificationService.assignNotification(
      notificationId,
      volunteerId
    );

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: unknown) {
    logger.error('Failed to assign notification:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to assign notification' },
      { status: 500 }
    );
  }
}