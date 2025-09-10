import { db, patients, reminderLogs, manualConfirmations } from '../src/db'
import { eq, and, count, sql } from 'drizzle-orm'

async function testPatientAPI() {
  console.log('🧪 Testing Patient API Compliance Calculation')
  console.log('============================================')

  try {
    const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

    // Get patient data
    const patientResult = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (patientResult.length === 0) {
      console.log('❌ Patient not found')
      return
    }

    const patient = patientResult[0]
    console.log(`👤 Patient: ${patient.name} (${patient.id})`)
    console.log(`📊 Status: ${patient.isActive ? 'Active' : 'Inactive'}`)
    console.log(`🔄 Last Reactivated: ${patient.lastReactivatedAt || 'Never'}`)
    console.log()

    // Test the compliance calculation logic
    console.log('📊 COMPLIANCE CALCULATION TEST:')
    console.log('===============================')

    // Get delivered reminders count (filtered by reactivation date)
    const lastReactivatedAt = patient.lastReactivatedAt

    let deliveredWhereConditions = [
      eq(reminderLogs.patientId, patientId),
      eq(reminderLogs.status, 'DELIVERED')
    ]

    if (lastReactivatedAt) {
      deliveredWhereConditions.push(sql`${reminderLogs.sentAt} >= ${lastReactivatedAt}`)
    }

    const deliveredLogsResult = await db
      .select({ count: count() })
      .from(reminderLogs)
      .where(and(...deliveredWhereConditions))

    const totalDeliveredReminders = deliveredLogsResult[0]?.count || 0

    // Get confirmations count (filtered by reactivation date)
    let confirmationsWhereConditions = [
      eq(manualConfirmations.patientId, patientId)
    ]

    if (lastReactivatedAt) {
      confirmationsWhereConditions.push(sql`${manualConfirmations.confirmedAt} >= ${lastReactivatedAt}`)
    }

    const confirmationsResult = await db
      .select({ count: count() })
      .from(manualConfirmations)
      .where(and(...confirmationsWhereConditions))

    const totalConfirmationsFiltered = confirmationsResult[0]?.count || 0

    // Calculate compliance rate
    const complianceRate = totalDeliveredReminders > 0
      ? Math.round((totalConfirmationsFiltered / totalDeliveredReminders) * 100)
      : 0

    console.log(`📨 Total Delivered Reminders: ${totalDeliveredReminders}`)
    console.log(`✅ Total Confirmations: ${totalConfirmationsFiltered}`)
    console.log(`📊 Compliance Rate: ${complianceRate}%`)
    console.log()

    // Show what data is being included
    console.log('📋 DATA INCLUSION ANALYSIS:')
    console.log('===========================')

    if (lastReactivatedAt) {
      console.log(`🔄 Patient was reactivated on: ${lastReactivatedAt}`)
      console.log('✅ Only counting reminders sent AFTER reactivation')
      console.log('✅ Only counting confirmations made AFTER reactivation')
    } else {
      console.log('ℹ️  Patient has never been reactivated')
      console.log('✅ Counting ALL historical reminders and confirmations')
    }

    console.log()
    console.log('🎯 EXPECTED BEHAVIOR:')
    console.log('=====================')
    console.log('1. If patient was reactivated: Only count data after reactivation date')
    console.log('2. If patient never reactivated: Count all historical data')
    console.log('3. Compliance = (confirmations / delivered_reminders) * 100')

    // Test with current data
    console.log()
    console.log('📊 CURRENT DATA SUMMARY:')
    console.log('========================')

    // Get all reminder logs for this patient
    const allLogs = await db
      .select()
      .from(reminderLogs)
      .where(eq(reminderLogs.patientId, patientId))
      .orderBy(sql`${reminderLogs.sentAt} DESC`)

    console.log(`Total Reminder Logs: ${allLogs.length}`)

    // Get all confirmations for this patient
    const allConfirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))
      .orderBy(sql`${manualConfirmations.confirmedAt} DESC`)

    console.log(`Total Confirmations: ${allConfirmations.length}`)

    if (lastReactivatedAt) {
      const logsAfterReactivation = allLogs.filter(log =>
        new Date(log.sentAt) >= new Date(lastReactivatedAt)
      )
      const confirmationsAfterReactivation = allConfirmations.filter(conf =>
        new Date(conf.confirmedAt) >= new Date(lastReactivatedAt)
      )

      console.log(`Logs after reactivation: ${logsAfterReactivation.length}`)
      console.log(`Confirmations after reactivation: ${confirmationsAfterReactivation.length}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testPatientAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })