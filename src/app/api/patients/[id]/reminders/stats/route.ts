import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminders, manualConfirmations } from "@/db";
import { eq, and, isNull, inArray } from "drizzle-orm";
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



    // Get all active reminders for patient
    const allReminders = await db
      .select({
        id: reminders.id,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
        sentAt: reminders.sentAt,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, id),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      );

    // Get manual confirmations
    const reminderIds = allReminders.map(r => r.id);
    const confirmations = reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

    const confirmedReminderIds = new Set(confirmations.map(c => c.reminderId));

    // Simple categorization logic
    let terjadwal = 0;
    let perluDiperbarui = 0;
    let selesai = 0;

    for (const reminder of allReminders) {
      // Selesai: confirmed OR manually confirmed
      if (
        reminder.confirmationStatus === 'CONFIRMED' ||
        confirmedReminderIds.has(reminder.id)
      ) {
        selesai++;
      }
      // Perlu Diperbarui: sent but no confirmation
      else if (
        reminder.status === 'SENT' ||
        reminder.status === 'DELIVERED'
      ) {
        perluDiperbarui++;
      }
      // Terjadwal: pending or failed
      else {
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
