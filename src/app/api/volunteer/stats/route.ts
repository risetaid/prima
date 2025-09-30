import { NextResponse } from 'next/server';
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service';

import { logger } from '@/lib/logger';
const notificationService = new VolunteerNotificationService();

export async function GET() {
  try {
    const stats = await notificationService.getNotificationStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch notification stats:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
}