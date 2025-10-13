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



    // Status contract (aligned with UI lists):
    // - Selesai      : confirmationStatus === 'CONFIRMED' OR manual confirmation exists
    // - Perlu Update : status in ('SENT','DELIVERED') AND confirmationStatus in ('PENDING','MISSED', null) AND no manual confirmation
    // - Terjadwal    : everything else (includes 'PENDING', 'FAILED' until we introduce a dedicated "Gagal" column)

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

    // Fetch manual confirmations for the same reminder ids so they can be
    // considered part of the "completed" bucket without mutating reminder rows
    const reminderIds = allReminders.map((reminder) => reminder.id)
    const manualConfirmationsByReminder =
      reminderIds.length > 0
        ? await db
            .select({ reminderId: manualConfirmations.reminderId })
            .from(manualConfirmations)
            .where(inArray(manualConfirmations.reminderId, reminderIds))
        : []

    const manuallyConfirmedIds = new Set(
      manualConfirmationsByReminder.map((entry) => entry.reminderId)
    )

    // Simple categorization logic
    let terjadwal = 0;
    let perluDiperbarui = 0;
    let selesai = 0;
    let dipatuhi = 0;
    let tidakDipatuhi = 0;

    for (const reminder of allReminders) {
      const isManuallyConfirmed = manuallyConfirmedIds.has(reminder.id)

      // Selesai: automated confirmation or manual confirmation entry
      if (reminder.confirmationStatus === 'CONFIRMED' || isManuallyConfirmed) {
        selesai++;
        // Count as complied (dipatuhi) if confirmed
        dipatuhi++;
      }
      // Perlu Diperbarui: sent/delivered but not confirmed
      else if (
        (reminder.status === 'SENT' || reminder.status === 'DELIVERED') &&
        (reminder.confirmationStatus === 'PENDING' || reminder.confirmationStatus === 'MISSED' || reminder.confirmationStatus === null) &&
        !isManuallyConfirmed
      ) {
        perluDiperbarui++;
      }
      // Terjadwal: pending or failed
      else {
        terjadwal++;
      }
    }

    // Fetch manual confirmations to get medications_taken for compliance calculation
    // Manual confirmations with empty/null medications_taken indicate non-compliance
    const manualConfirmationsWithMeds =
      reminderIds.length > 0
        ? await db
            .select({
              reminderId: manualConfirmations.reminderId,
              medicationsTaken: manualConfirmations.medicationsTaken,
            })
            .from(manualConfirmations)
            .where(inArray(manualConfirmations.reminderId, reminderIds))
        : [];

    // Build a map of reminder_id -> medications_taken for efficient lookup
    const medsMap = new Map<string, string[] | null>();
    for (const mc of manualConfirmationsWithMeds) {
      medsMap.set(mc.reminderId!, mc.medicationsTaken);
    }

    // Re-calculate dipatuhi and tidakDipatuhi based on medications_taken
    // Reset counters
    dipatuhi = 0;
    tidakDipatuhi = 0;

    for (const reminder of allReminders) {
      const isManuallyConfirmed = manuallyConfirmedIds.has(reminder.id);
      const medicationsTaken = medsMap.get(reminder.id);

      // Only count completed reminders for compliance
      if (reminder.confirmationStatus === 'CONFIRMED') {
        // Automated confirmation - assume complied
        dipatuhi++;
      } else if (isManuallyConfirmed) {
        // Manual confirmation - check medications_taken
        if (medicationsTaken && medicationsTaken.length > 0) {
          dipatuhi++;
        } else {
          // Empty or null medications_taken means not complied
          tidakDipatuhi++;
        }
      }
    }

    const stats = {
      terjadwal,
      perluDiperbarui,
      selesai,
      semua: terjadwal + perluDiperbarui + selesai,
      compliance: {
        dipatuhi,
        tidakDipatuhi,
        total: dipatuhi + tidakDipatuhi,
        rate: dipatuhi + tidakDipatuhi > 0 
          ? Math.round((dipatuhi / (dipatuhi + tidakDipatuhi)) * 100) 
          : 0,
      },
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
