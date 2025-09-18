import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
// Rate limiter temporarily disabled

// GET endpoint for cron functions
export async function GET(request: NextRequest) {
  // Verify this is called by cron with secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await processReminders();
}

// POST endpoint for manual trigger during development/testing
export async function POST(request: NextRequest) {
  // Always require auth in production
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return await processReminders();
}

async function processReminders() {
  logger.info('Reminder cron processing disabled - tables removed in schema cleanup');

  return NextResponse.json({
    success: false,
    disabled: true,
    reason: 'Reminder processing disabled due to schema cleanup - reminderSchedules and reminderLogs tables removed',
    timestamp: new Date().toISOString(),
    message: 'This functionality is temporarily disabled'
  });
}
