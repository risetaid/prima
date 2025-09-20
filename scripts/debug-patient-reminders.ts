import { db, reminders, manualConfirmations } from '@/db'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { logger } from '@/lib/logger'

async function debugPatientReminders() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    logger.info('🔍 Debugging patient reminders for:', { patientId })
    logger.info('=' .repeat(60))

    // 1. Get all reminders (active and inactive)
    logger.info('\n📅 REMINDERS:')
    const allReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.patientId, patientId))
      .orderBy(desc(reminders.createdAt))

    logger.info(`Total reminders found: ${allReminders.length}`)
    allReminders.forEach((reminder, index) => {
      logger.info(`${index + 1}. ID: ${reminder.id}`)
      logger.info(`   Active: ${reminder.isActive}`)
      logger.info(`   Status: ${reminder.status}`)
      logger.info(`   Deleted: ${reminder.deletedAt ? 'Yes' : 'No'}`)
      logger.info(`   Start Date: ${reminder.startDate}`)
      logger.info(`   Sent At: ${reminder.sentAt || 'Not sent'}`)
      logger.info(`   Created: ${reminder.createdAt}`)
      logger.info('')
    })

    // 2. Get active reminders only (what the API uses)
    logger.info('\n✅ ACTIVE REMINDERS ONLY (what API uses):')
    const activeReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )

    logger.info(`Active reminders: ${activeReminders.length}`)
    activeReminders.forEach((reminder, index) => {
      logger.info(`${index + 1}. ID: ${reminder.id} - ${reminder.status}`)
    })

    // 3. Get delivered reminders only
    logger.info('\n📨 DELIVERED REMINDERS ONLY:')
    const deliveredReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.status, 'DELIVERED')
        )
      )
      .orderBy(desc(reminders.sentAt))

    logger.info(`Delivered reminders: ${deliveredReminders.length}`)
    deliveredReminders.forEach((reminder, index) => {
      logger.info(`${index + 1}. ID: ${reminder.id}`)
      logger.info(`   Sent At: ${reminder.sentAt}`)
    })

    // 4. Get confirmations
    logger.info('\n✅ MANUAL CONFIRMATIONS:')
    const confirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))
      .orderBy(desc(manualConfirmations.confirmedAt))

    logger.info(`Total confirmations: ${confirmations.length}`)
    confirmations.forEach((conf, index) => {
      logger.info(`${index + 1}. Reminder ID: ${conf.reminderId}`)
      logger.info(`   Confirmed At: ${conf.confirmedAt}`)
    })

    logger.info('\n🔍 ANALYSIS:')
    logger.info(`- Total reminders: ${allReminders.length}`)
    logger.info(`- Active reminders: ${activeReminders.length}`)
    logger.info(`- Delivered reminders: ${deliveredReminders.length}`)
    logger.info(`- Confirmations: ${confirmations.length}`)

    const inactiveReminders = allReminders.length - activeReminders.length
    const pendingReminders = allReminders.length - deliveredReminders.length

    logger.info(`- Inactive/deleted reminders: ${inactiveReminders}`)
    logger.info(`- Pending/failed reminders: ${pendingReminders}`)

  } catch (error) {
    logger.error('❌ Error debugging patient reminders:', error as Error)
  }
}

debugPatientReminders()
