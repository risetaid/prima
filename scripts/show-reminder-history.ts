import { db, patients, reminderSchedules, reminderLogs, manualConfirmations } from '../src/db'
import { eq, and, isNull, desc } from 'drizzle-orm'

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

    // Get ALL reminder schedules (including inactive ones)
    const allSchedules = await db
      .select()
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, patient.id))
      .orderBy(desc(reminderSchedules.createdAt))

    console.log(`📋 ALL REMINDER SCHEDULES (${allSchedules.length}):`)
    console.log('================================================')

    allSchedules.forEach((schedule, index) => {
      console.log(`${index + 1}. ${schedule.medicationName || 'Unknown'}`)
      console.log(`   ⏰ Time: ${schedule.scheduledTime}`)
      console.log(`   📅 Start: ${schedule.startDate.toISOString().split('T')[0]}`)
      console.log(`   ✅ Active: ${schedule.isActive ? 'Yes' : 'No'}`)
      console.log(`   🕒 Created: ${schedule.createdAt}`)
      console.log()
    })

    // Get only ACTIVE reminder schedules
    const activeSchedules = allSchedules.filter(s => s.isActive)
    console.log(`📋 ACTIVE REMINDER SCHEDULES (${activeSchedules.length}):`)
    console.log('=======================================================')

    if (activeSchedules.length === 0) {
      console.log('❌ No active reminder schedules found!')
      console.log('💡 This explains why Terjadwal/Perlu Diperbarui/Semua = 0')
    } else {
      activeSchedules.forEach((schedule, index) => {
        console.log(`${index + 1}. ${schedule.medicationName || 'Unknown'} - ${schedule.scheduledTime}`)
      })
    }
    console.log()

    // Get reminder logs history
    const allLogs = await db
      .select()
      .from(reminderLogs)
      .where(eq(reminderLogs.patientId, patient.id))
      .orderBy(desc(reminderLogs.sentAt))

    console.log(`📨 REMINDER LOGS HISTORY (${allLogs.length}):`)
    console.log('===========================================')

    if (allLogs.length === 0) {
      console.log('❌ No reminder logs found')
    } else {
      allLogs.slice(0, 10).forEach((log, index) => {
        const schedule = allSchedules.find(s => s.id === log.reminderScheduleId)
        const scheduleName = schedule ? schedule.medicationName : 'Unknown'
        const isActive = schedule ? schedule.isActive : false

        console.log(`${index + 1}. ${scheduleName} (${log.status})`)
        console.log(`   📅 Sent: ${log.sentAt}`)
        console.log(`   📋 Schedule Active: ${isActive ? 'Yes' : 'No'}`)
        console.log(`   💬 Message: ${log.message.substring(0, 50)}...`)
        console.log()
      })

      if (allLogs.length > 10) {
        console.log(`... and ${allLogs.length - 10} more logs`)
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
        const schedule = allSchedules.find(s => s.id === conf.reminderScheduleId)
        const scheduleName = schedule ? schedule.medicationName : 'Unknown'
        const isActive = schedule ? schedule.isActive : false

        console.log(`${index + 1}. ${scheduleName} (${conf.medicationsTaken ? 'Ya' : 'Tidak'})`)
        console.log(`   📅 Confirmed: ${conf.confirmedAt}`)
        console.log(`   📋 Schedule Active: ${isActive ? 'Yes' : 'No'}`)
        console.log()
      })

      if (allConfirmations.length > 10) {
        console.log(`... and ${allConfirmations.length - 10} more confirmations`)
      }
    }

    // Analysis
    console.log('🔍 ANALYSIS:')
    console.log('============')
    console.log(`Total Schedules: ${allSchedules.length}`)
    console.log(`Active Schedules: ${activeSchedules.length}`)
    console.log(`Inactive Schedules: ${allSchedules.length - activeSchedules.length}`)
    console.log(`Total Logs: ${allLogs.length}`)
    console.log(`Total Confirmations: ${allConfirmations.length}`)

    // Note: Patient reactivation tracking is handled in the database
    // Old reminder schedules may be deactivated and not counted in stats
    // But compliance calculation includes historical data

    console.log()
    console.log('🎯 RECOMMENDATION:')
    console.log('==================')
    if (activeSchedules.length === 0 && allSchedules.length > 0) {
      console.log('✅ Reactivate old reminder schedules OR create new ones')
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