import { db, reminderSchedules, reminderLogs, patients } from '@/db/index.js'
import { eq, and, sql, isNull } from 'drizzle-orm'
import { getWIBDateString } from '@/lib/timezone.js'

async function checkReminders() {
  try {
    console.log('🔍 Checking current reminder state...')
    console.log('📅 Today WIB:', getWIBDateString())

    // Get today's active reminders
    const todayReminders = await db
      .select({
        id: reminderSchedules.id,
        patientName: patients.name,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        isActive: reminderSchedules.isActive
      })
      .from(reminderSchedules)
      .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
      .where(
        and(
          eq(reminderSchedules.isActive, true),
          eq(sql`DATE(${reminderSchedules.startDate})`, getWIBDateString()),
          isNull(reminderSchedules.deletedAt),
          isNull(patients.deletedAt)
        )
      )

    console.log(`\n📋 Found ${todayReminders.length} active reminders for today:`)
    todayReminders.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.patientName} - ${reminder.medicationName} at ${reminder.scheduledTime} (${reminder.isActive ? 'Active' : 'Inactive'})`)
    })

    // Get today's reminder logs
    const todayLogs = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
        message: reminderLogs.message
      })
      .from(reminderLogs)
      .where(
        and(
          eq(sql`DATE(${reminderLogs.sentAt})`, getWIBDateString()),
          isNull(reminderLogs.deletedAt)
        )
      )

    console.log(`\n📨 Found ${todayLogs.length} reminder logs for today:`)
    todayLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. Schedule ${log.reminderScheduleId} - ${log.status} at ${log.sentAt}`)
    })

    // Check which reminders would be sent with our new logic
    console.log('\n🎯 Testing smart duplicate prevention:')
    const remindersToSend = await db
      .select({
        id: reminderSchedules.id,
        patientName: patients.name,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
      .where(
        and(
          eq(reminderSchedules.isActive, true),
          eq(sql`DATE(${reminderSchedules.startDate})`, getWIBDateString()),
          isNull(reminderSchedules.deletedAt),
          isNull(patients.deletedAt),
          // SMART DUPLICATE PREVENTION: Only send reminders that haven't been delivered today
          sql`NOT EXISTS (
            SELECT 1 FROM ${reminderLogs}
            WHERE ${reminderLogs.reminderScheduleId} = ${reminderSchedules.id}
            AND ${reminderLogs.status} = 'DELIVERED'
            AND DATE(${reminderLogs.sentAt}) = ${getWIBDateString()}
          )`
        )
      )

    console.log(`\n✅ Reminders that would be sent with smart duplicate prevention: ${remindersToSend.length}`)
    remindersToSend.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.patientName} - ${reminder.medicationName} at ${reminder.scheduledTime}`)
    })

  } catch (error) {
    console.error('❌ Error checking reminders:', error)
  } finally {
    process.exit(0)
  }
}

checkReminders()
