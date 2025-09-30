import { NextRequest, NextResponse } from 'next/server';
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service';
import { getCurrentUser } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
const notificationService = new VolunteerNotificationService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

    // Get current authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const volunteerId = currentUser.id;

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