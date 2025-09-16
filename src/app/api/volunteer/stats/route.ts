import { NextResponse } from 'next/server';
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service';

const notificationService = new VolunteerNotificationService();

export async function GET() {
  try {
    const stats = await notificationService.getNotificationStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch notification stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
}