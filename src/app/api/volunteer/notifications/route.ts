import { NextRequest, NextResponse } from 'next/server';
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service';

const notificationService = new VolunteerNotificationService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifications = await notificationService.getNotificationsWithDetails(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priority as any,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, message, reason, confidence, intent, patientContext } = body;

    if (!patientId || !message || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification({
      patientId,
      message,
      reason,
      confidence,
      intent,
      patientContext,
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}