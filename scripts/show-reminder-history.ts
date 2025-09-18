import { db, patients, reminders, manualConfirmations } from '@/db'
import { eq, and, isNull, not, desc } from 'drizzle-orm'

async function showReminderHistory() {
  console.log('📋 Reminder History Analysis')
  console.log('===========================')

  try {
    // Get a patient to analyze (you can modify this to get a specific patient)
    const testPatient = await db
      .select()
      .from(patients)
      .where(and(isNull(patients.deletedAt), eq(patients.isActive, true)))
      .limit(1)

    if (testPatient.length === 0) {
      console.log('❌ No active patients found')
      return
    }

    const patient = testPatient[0]
    console.log(`👤 Patient: ${patient.name} (${patient.id})`)
    console.log(`📅 Created: ${patient.createdAt}`)
    console.log(`📊 Status: ${patient.isActive ? 'Active' : 'Inactive'}`)
    console.log()

    // Get ALL reminders (including inactive ones)
    const allReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.patientId, patient.id))
      .orderBy(desc(reminders.createdAt))

    console.log(`📋 ALL REMINDERS (${allReminders.length}):`)
    console.log('=====================================')

    allReminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ${reminder.message}`)
      console.log(`   ⏰ Time: ${reminder.scheduledTime}`)
      console.log(`   📅 Start: ${reminder.startDate.toISOString().split('T')[0]}`)
      console.log(`   ✅ Active: ${reminder.isActive ? 'Yes' : 'No'}`)
      console.log(`   📊 Status: ${reminder.status}`)
      console.log(`   🕒 Created: ${reminder.createdAt}`)
      console.log()
    })

    // Get only ACTIVE reminders
    const activeReminders = allReminders.filter(r => r.isActive)
    console.log(`📋 ACTIVE REMINDERS (${activeReminders.length}):`)
    console.log('===============================================')

    if (activeReminders.length === 0) {
      console.log('❌ No active reminders found!')
      console.log('💡 This explains why Terjadwal/Perlu Diperbarui/Semua = 0')
    } else {
      activeReminders.forEach((reminder, index) => {
        console.log(`${index + 1}. ${reminder.message} - ${reminder.scheduledTime}`)
      })
    }
    console.log()

    // Get sent reminders history
    const sentReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patient.id),
          not(isNull(reminders.sentAt))
        )
      )
      .orderBy(desc(reminders.sentAt))

    console.log(`📨 SENT REMINDERS HISTORY (${sentReminders.length}):`)
    console.log('===============================================')

    if (sentReminders.length === 0) {
      console.log('❌ No sent reminders found')
    } else {
      sentReminders.slice(0, 10).forEach((reminder, index) => {
        console.log(`${index + 1}. ${reminder.message} (${reminder.status})`)
        console.log(`   📅 Sent: ${reminder.sentAt}`)
        console.log(`   📋 Active: ${reminder.isActive ? 'Yes' : 'No'}`)
        console.log(`   💬 Message: ${reminder.message.substring(0, 50)}...`)
        console.log()
      })

      if (sentReminders.length > 10) {
        console.log(`... and ${sentReminders.length - 10} more reminders`)
      }
    }

    // Get confirmations history
    const allConfirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patient.id))
      .orderBy(desc(manualConfirmations.confirmedAt))

    console.log(`✅ CONFIRMATIONS HISTORY (${allConfirmations.length}):`)
    console.log('===============================================')

    if (allConfirmations.length === 0) {
      console.log('❌ No confirmations found')
    } else {
      allConfirmations.slice(0, 10).forEach((conf, index) => {
        const reminder = allReminders.find(r => r.id === conf.reminderId)
        const reminderMessage = reminder ? reminder.message : 'Unknown'

        console.log(`${index + 1}. ${reminderMessage}`)
        console.log(`   📅 Confirmed: ${conf.confirmedAt}`)
        console.log(`   📋 Reminder Active: ${reminder?.isActive ? 'Yes' : 'No'}`)
        console.log()
      })

      if (allConfirmations.length > 10) {
        console.log(`... and ${allConfirmations.length - 10} more confirmations`)
      }
    }

    // Analysis
    console.log('🔍 ANALYSIS:')
    console.log('============')
    console.log(`Total Reminders: ${allReminders.length}`)
    console.log(`Active Reminders: ${activeReminders.length}`)
    console.log(`Inactive Reminders: ${allReminders.length - activeReminders.length}`)
    console.log(`Sent Reminders: ${sentReminders.length}`)
    console.log(`Total Confirmations: ${allConfirmations.length}`)

    // Note: Patient reactivation tracking is handled in the database
    // Old reminders may be deactivated and not counted in stats
    // But compliance calculation includes historical data

    console.log()
    console.log('🎯 RECOMMENDATION:')
    console.log('==================')
    if (activeReminders.length === 0 && allReminders.length > 0) {
      console.log('✅ Reactivate old reminders OR create new ones')
      console.log('✅ This will fix the "Terjadwal/Perlu Diperbarui/Semua = 0" issue')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the analysis
showReminderHistory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
