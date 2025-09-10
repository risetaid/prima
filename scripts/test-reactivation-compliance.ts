import { db, patients, reminderLogs, manualConfirmations } from '../src/db'
import { eq, and, count, sql } from 'drizzle-orm'

async function testReactivationCompliance() {
  console.log('🧪 Testing Reactivation Compliance Filtering')
  console.log('===========================================')

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
    console.log()

    // BEFORE REACTIVATION (current state)
    console.log('📊 BEFORE REACTIVATION:')
    console.log('=======================')

    const beforeDeliveredResult = await db
      .select({ count: count() })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.status, 'DELIVERED')
        )
      )

    const beforeConfirmationsResult = await db
      .select({ count: count() })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))

    const beforeDelivered = beforeDeliveredResult[0]?.count || 0
    const beforeConfirmations = beforeConfirmationsResult[0]?.count || 0
    const beforeCompliance = beforeDelivered > 0 ? Math.round((beforeConfirmations / beforeDelivered) * 100) : 0

    console.log(`📨 Delivered Reminders: ${beforeDelivered}`)
    console.log(`✅ Confirmations: ${beforeConfirmations}`)
    console.log(`📊 Compliance Rate: ${beforeCompliance}%`)
    console.log()

    // SIMULATE REACTIVATION
    console.log('🔄 SIMULATING PATIENT REACTIVATION...')
    console.log('=====================================')

    const reactivationDate = new Date()

    // Update patient with reactivation date
    await db
      .update(patients)
      .set({
        lastReactivatedAt: reactivationDate,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId))

    console.log(`✅ Patient reactivated at: ${reactivationDate}`)
    console.log()

    // AFTER REACTIVATION (with filtering)
    console.log('📊 AFTER REACTIVATION (FILTERED):')
    console.log('=================================')

    // Get delivered reminders AFTER reactivation
    const afterDeliveredResult = await db
      .select({ count: count() })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.status, 'DELIVERED'),
          sql`${reminderLogs.sentAt} >= ${reactivationDate.toISOString()}`
        )
      )

    // Get confirmations AFTER reactivation
    const afterConfirmationsResult = await db
      .select({ count: count() })
      .from(manualConfirmations)
      .where(
        and(
          eq(manualConfirmations.patientId, patientId),
          sql`${manualConfirmations.confirmedAt} >= ${reactivationDate.toISOString()}`
        )
      )

    const afterDelivered = afterDeliveredResult[0]?.count || 0
    const afterConfirmations = afterConfirmationsResult[0]?.count || 0
    const afterCompliance = afterDelivered > 0 ? Math.round((afterConfirmations / afterDelivered) * 100) : 0

    console.log(`📨 Delivered Reminders (after reactivation): ${afterDelivered}`)
    console.log(`✅ Confirmations (after reactivation): ${afterConfirmations}`)
    console.log(`📊 Compliance Rate (filtered): ${afterCompliance}%`)
    console.log()

    // COMPARISON
    console.log('📊 COMPARISON:')
    console.log('==============')
    console.log(`Before Reactivation: ${beforeCompliance}% (${beforeConfirmations}/${beforeDelivered})`)
    console.log(`After Reactivation:  ${afterCompliance}% (${afterConfirmations}/${afterDelivered})`)
    console.log()

    if (beforeCompliance !== afterCompliance) {
      console.log('🎉 SUCCESS! Compliance filtering is working correctly')
      console.log('✅ Old historical data is properly excluded')
      console.log('✅ Only new data after reactivation is counted')
    } else {
      console.log('⚠️  No difference detected - this could mean:')
      console.log('   - No new reminders/confirmations after reactivation')
      console.log('   - Or the filtering logic needs adjustment')
    }

    // Show what data exists after reactivation date
    console.log()
    console.log('📋 DATA AFTER REACTIVATION DATE:')
    console.log('=================================')

    const recentLogs = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          sql`${reminderLogs.sentAt} >= ${reactivationDate.toISOString()}`
        )
      )

    const recentConfirmations = await db
      .select()
      .from(manualConfirmations)
      .where(
        and(
          eq(manualConfirmations.patientId, patientId),
          sql`${manualConfirmations.confirmedAt} >= ${reactivationDate.toISOString()}`
        )
      )

    console.log(`Recent Reminder Logs: ${recentLogs.length}`)
    console.log(`Recent Confirmations: ${recentConfirmations.length}`)

    if (recentLogs.length === 0) {
      console.log('💡 No reminders sent after reactivation date')
      console.log('💡 This explains why compliance might be 0% or unchanged')
    }

    // CLEANUP: Reset the patient (remove reactivation date for testing)
    console.log()
    console.log('🧹 CLEANUP: Resetting patient reactivation status...')
    await db
      .update(patients)
      .set({
        lastReactivatedAt: null,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId))

    console.log('✅ Patient reactivation status reset')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testReactivationCompliance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })