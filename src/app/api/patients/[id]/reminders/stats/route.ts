import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { PatientAccessControl } from '@/services/patient/patient-access-control'
import { db, reminders, manualConfirmations } from '@/db'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import {
  get,
  set,
  del,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Query schema for cache invalidation
const reminderStatsQuerySchema = z.object({
  invalidate: z.enum(["true", "false"]).optional(),
});

// GET /api/patients/[id]/reminders/stats - Get patient reminder statistics
export const GET = createApiHandler(
  { auth: "required", params: schemas.uuidParam, query: reminderStatsQuerySchema },
  async (_, { user, params, query }) => {
    const { id } = params!;
    const { invalidate } = query!;

    // Require patient access control
    await PatientAccessControl.requireAccess(
      user!.id,
      user!.role,
      id,
      "view reminder statistics"
    );

    // Check for cache invalidation request
    const shouldInvalidate = invalidate === "true";

    // Try to get from cache first (unless invalidating)
    const cacheKey = CACHE_KEYS.reminderStats(id);
    if (!shouldInvalidate) {
      const cachedStats = await get(cacheKey);
      if (cachedStats) {
        return cachedStats;
      }
    } else {
      // Invalidate cache when requested
      await del(cacheKey);
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
    await set(cacheKey, stats, CACHE_TTL.REMINDER_STATS);

    logger.info('Patient reminder statistics retrieved', {
      patientId: id,
      userId: user!.id,
      stats
    });

    return stats;
  }
);
