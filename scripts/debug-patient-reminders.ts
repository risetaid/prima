import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, isNull, desc } from 'drizzle-orm'

async function debugPatientReminders() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    console.log('🔍 Debugging patient reminders for:', patientId)
    console.log('=' .repeat(60))

    // 1. Get all reminder schedules (active and inactive)
    console.log('\n📅 REMINDER SCHEDULES:')
    const allSchedules = await db
      .select()
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, patientId))
      .orderBy(desc(reminderSchedules.createdAt))

    console.log(`Total schedules found: ${allSchedules.length}`)
    allSchedules.forEach((schedule, index) => {
      console.log(`${index + 1}. ID: ${schedule.id}`)
      console.log(`   Active: ${schedule.isActive}`)
      console.log(`   Deleted: ${schedule.deletedAt ? 'Yes' : 'No'}`)
      console.log(`   Start Date: ${schedule.startDate}`)
      console.log(`   Created: ${schedule.createdAt}`)
      console.log('')
    })

    // 2. Get all reminder logs
    console.log('\n📨 REMINDER LOGS:')
    const allLogs = await db
      .select()
      .from(reminderLogs)
      .where(eq(reminderLogs.patientId, patientId))
      .orderBy(desc(reminderLogs.sentAt))

    console.log(`Total logs found: ${allLogs.length}`)
    allLogs.forEach((log, index) => {
      console.log(`${index + 1}. Schedule ID: ${log.reminderScheduleId}`)
      console.log(`   Status: ${log.status}`)
      console.log(`   Sent At: ${log.sentAt}`)
      console.log('')
    })

    // 3. Get active schedules only (what the API uses)
    console.log('\n✅ ACTIVE SCHEDULES ONLY (what API uses):')
    const activeSchedules = await db
      .select()
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, patientId),
          eq(reminderSchedules.isActive, true),
          isNull(reminderSchedules.deletedAt)
        )
      )

    console.log(`Active schedules: ${activeSchedules.length}`)
    activeSchedules.forEach((schedule, index) => {
      console.log(`${index + 1}. ID: ${schedule.id}`)
    })

    // 4. Get delivered logs only
    console.log('\n📨 DELIVERED LOGS ONLY:')
    const deliveredLogs = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.status, 'DELIVERED')
        )
      )
      .orderBy(desc(reminderLogs.sentAt))

    console.log(`Delivered logs: ${deliveredLogs.length}`)
    deliveredLogs.forEach((log, index) => {
      console.log(`${index + 1}. Schedule ID: ${log.reminderScheduleId}`)
      console.log(`   Sent At: ${log.sentAt}`)
    })

    // 5. Get confirmations
    console.log('\n✅ MANUAL CONFIRMATIONS:')
    const confirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))
      .orderBy(desc(manualConfirmations.confirmedAt))

    console.log(`Total confirmations: ${confirmations.length}`)
    confirmations.forEach((conf, index) => {
      console.log(`${index + 1}. Reminder Log ID: ${conf.reminderLogId}`)
      console.log(`   Confirmed At: ${conf.confirmedAt}`)
    })

    console.log('\n🔍 ANALYSIS:')
    console.log(`- Total schedules: ${allSchedules.length}`)
    console.log(`- Active schedules: ${activeSchedules.length}`)
    console.log(`- Total logs: ${allLogs.length}`)
    console.log(`- Delivered logs: ${deliveredLogs.length}`)
    console.log(`- Confirmations: ${confirmations.length}`)

    const inactiveSchedules = allSchedules.length - activeSchedules.length
    const failedLogs = allLogs.length - deliveredLogs.length

    console.log(`- Inactive/deleted schedules: ${inactiveSchedules}`)
    console.log(`- Failed/pending logs: ${failedLogs}`)

  } catch (error) {
    console.error('❌ Error debugging patient reminders:', error)
  }
}

debugPatientReminders()
