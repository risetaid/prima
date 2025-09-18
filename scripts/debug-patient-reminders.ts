import { db, reminders, manualConfirmations } from '@/db'
import { eq, and, isNull, desc } from 'drizzle-orm'

async function debugPatientReminders() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    console.log('🔍 Debugging patient reminders for:', patientId)
    console.log('=' .repeat(60))

    // 1. Get all reminders (active and inactive)
    console.log('\n📅 REMINDERS:')
    const allReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.patientId, patientId))
      .orderBy(desc(reminders.createdAt))

    console.log(`Total reminders found: ${allReminders.length}`)
    allReminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ID: ${reminder.id}`)
      console.log(`   Active: ${reminder.isActive}`)
      console.log(`   Status: ${reminder.status}`)
      console.log(`   Deleted: ${reminder.deletedAt ? 'Yes' : 'No'}`)
      console.log(`   Start Date: ${reminder.startDate}`)
      console.log(`   Sent At: ${reminder.sentAt || 'Not sent'}`)
      console.log(`   Created: ${reminder.createdAt}`)
      console.log('')
    })

    // 2. Get active reminders only (what the API uses)
    console.log('\n✅ ACTIVE REMINDERS ONLY (what API uses):')
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

    console.log(`Active reminders: ${activeReminders.length}`)
    activeReminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ID: ${reminder.id} - ${reminder.status}`)
    })

    // 3. Get delivered reminders only
    console.log('\n📨 DELIVERED REMINDERS ONLY:')
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

    console.log(`Delivered reminders: ${deliveredReminders.length}`)
    deliveredReminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ID: ${reminder.id}`)
      console.log(`   Sent At: ${reminder.sentAt}`)
    })

    // 4. Get confirmations
    console.log('\n✅ MANUAL CONFIRMATIONS:')
    const confirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))
      .orderBy(desc(manualConfirmations.confirmedAt))

    console.log(`Total confirmations: ${confirmations.length}`)
    confirmations.forEach((conf, index) => {
      console.log(`${index + 1}. Reminder ID: ${conf.reminderId}`)
      console.log(`   Confirmed At: ${conf.confirmedAt}`)
    })

    console.log('\n🔍 ANALYSIS:')
    console.log(`- Total reminders: ${allReminders.length}`)
    console.log(`- Active reminders: ${activeReminders.length}`)
    console.log(`- Delivered reminders: ${deliveredReminders.length}`)
    console.log(`- Confirmations: ${confirmations.length}`)

    const inactiveReminders = allReminders.length - activeReminders.length
    const pendingReminders = allReminders.length - deliveredReminders.length

    console.log(`- Inactive/deleted reminders: ${inactiveReminders}`)
    console.log(`- Pending/failed reminders: ${pendingReminders}`)

  } catch (error) {
    console.error('❌ Error debugging patient reminders:', error)
  }
}

debugPatientReminders()
