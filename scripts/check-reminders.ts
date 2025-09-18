import { db, reminders, patients } from '@/db/index.js'
import { eq, and, sql, isNull } from 'drizzle-orm'
import { getWIBDateString } from '@/lib/timezone.js'

async function checkReminders() {
  try {
    console.log('🔍 Checking current reminder state...')
    console.log('📅 Today WIB:', getWIBDateString())

    // Get today's active reminders
    const todayReminders = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        isActive: reminders.isActive,
        status: reminders.status
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.isActive, true),
          eq(sql`DATE(${reminders.startDate})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt)
        )
      )

    console.log(`\n📋 Found ${todayReminders.length} active reminders for today:`)
    todayReminders.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.patientName} - Pengingat at ${reminder.scheduledTime} (${reminder.status})`)
    })

    // Get today's sent reminders
    const todaySent = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        status: reminders.status,
        sentAt: reminders.sentAt,
        message: reminders.message
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(sql`DATE(${reminders.sentAt})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt)
        )
      )

    console.log(`\n📨 Found ${todaySent.length} reminders sent today:`)
    todaySent.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.patientName} - ${reminder.status} at ${reminder.sentAt}`)
    })

    // Check which reminders would be sent with our new logic
    console.log('\n🎯 Testing smart duplicate prevention:')
    const remindersToSend = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        scheduledTime: reminders.scheduledTime
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.isActive, true),
          eq(sql`DATE(${reminders.startDate})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt),
          // SMART DUPLICATE PREVENTION: Only send reminders that haven't been delivered today
          sql`(${reminders.status} != 'DELIVERED' OR ${reminders.sentAt} IS NULL OR DATE(${reminders.sentAt}) != ${getWIBDateString()})`
        )
      )

    console.log(`\n✅ Reminders that would be sent with smart duplicate prevention: ${remindersToSend.length}`)
    remindersToSend.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.patientName} - Pengingat at ${reminder.scheduledTime}`)
    })

  } catch (error) {
    console.error('❌ Error checking reminders:', error)
  } finally {
    process.exit(0)
  }
}

checkReminders()
