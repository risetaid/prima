import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminders, manualConfirmations } from "@/db";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";

import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for cache invalidation request
    const { searchParams } = new URL(request.url);
    const invalidate = searchParams.get("invalidate") === "true";

    // Try to get from cache first (unless invalidating)
    const cacheKey = CACHE_KEYS.reminderStats(id);
    if (!invalidate) {
      const cachedStats = await getCachedData(cacheKey);
      if (cachedStats) {
        return NextResponse.json(cachedStats);
      }
    } else {
      // Invalidate cache when requested
      await invalidateCache(cacheKey);
    }



    // Get all active reminder schedules for this patient
    const allSchedules = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        startDate: reminders.startDate,
        scheduledTime: reminders.scheduledTime,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, id),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      );

    // Get all reminders with their status (replaces reminder logs)
    const allLogs = await db
      .select({
        id: reminders.id,
        reminderScheduleId: reminders.id, // Use same ID for compatibility
        status: reminders.status,
        sentAt: reminders.sentAt,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, id),
          inArray(reminders.status, ["SENT", "DELIVERED", "FAILED"]),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )
      .orderBy(desc(reminders.sentAt));

    // Get all manual confirmations for this patient
    const allConfirmations = await db
      .select({
        id: manualConfirmations.id,
        reminderId: manualConfirmations.reminderId,
        visitDate: manualConfirmations.visitDate,
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id));

    // Initialize counters
    let terjadwal = 0;
    let perluDiperbarui = 0;
    let selesai = 0;

    // Process each individual log to determine its status
    for (const log of allLogs) {
      // Check if this specific log has been confirmed
      const logConfirmation = allConfirmations.find(
        (conf) => conf.reminderId === log.id
      );

      if (logConfirmation) {
        // Log has been confirmed - completed
        selesai++;
      } else if (["SENT", "DELIVERED"].includes(log.status)) {
        // Log sent but not confirmed - needs update
        perluDiperbarui++;
      } else if (log.status === "FAILED") {
        // Log failed - still scheduled (will be retried)
        terjadwal++;
      } else {
        // Unknown status - treat as scheduled
        terjadwal++;
      }
    }

    // Add schedules that have no logs yet
    for (const schedule of allSchedules) {
      const hasLogs = allLogs.some(
        (log) => log.reminderScheduleId === schedule.id
      );
      if (!hasLogs) {
        terjadwal++;
      }
    }

    const stats = {
      terjadwal,
      perluDiperbarui,
      selesai,
      semua: terjadwal + perluDiperbarui + selesai,
    };

    // Cache the stats with shorter TTL since they change more frequently
    await setCachedData(cacheKey, stats, CACHE_TTL.REMINDER_STATS);

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
