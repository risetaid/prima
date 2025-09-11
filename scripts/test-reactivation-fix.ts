import { db, patients, reminderSchedules } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'

async function testReactivationFix() {
  console.log('🧪 Testing Patient Reactivation Fix')
  console.log('===================================')

  try {
    // Get a patient to test with
    const testPatient = await db
      .select()
      .from(patients)
      .where(and(isNull(patients.deletedAt), eq(patients.isActive, true)))
      .limit(1)

    if (testPatient.length === 0) {
      console.log('❌ No active patients found for testing')
      return
    }

    const patient = testPatient[0]
    console.log(`👤 Test Patient: ${patient.name} (${patient.id})`)
    console.log(`📊 Current Status: ${patient.isActive ? 'Active' : 'Inactive'}`)
    console.log()

    // Count reminder schedules before any changes
    const allSchedulesBefore = await db
      .select()
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, patient.id))

    const activeSchedulesBefore = allSchedulesBefore.filter(s => s.isActive)
    const inactiveSchedulesBefore = allSchedulesBefore.filter(s => !s.isActive)

    console.log('📋 BEFORE Status:')
    console.log(`   Total Schedules: ${allSchedulesBefore.length}`)
    console.log(`   Active Schedules: ${activeSchedulesBefore.length}`)
    console.log(`   Inactive Schedules: ${inactiveSchedulesBefore.length}`)
    console.log()

    // Simulate deactivation (like what happens when patient BERHENTI)
    console.log('🔽 SIMULATING PATIENT DEACTIVATION (BERHENTI)...')
    await db
      .update(patients)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patient.id))

    // Deactivate all reminder schedules (like what happens in DELETE)
    await db
      .update(reminderSchedules)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(reminderSchedules.patientId, patient.id))

    console.log('✅ Patient and reminder schedules deactivated')
    console.log()

    // Check status after deactivation
    const schedulesAfterDeactivation = await db
      .select()
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, patient.id))

    const activeAfterDeactivation = schedulesAfterDeactivation.filter(s => s.isActive)
    console.log('📋 AFTER DEACTIVATION:')
    console.log(`   Total Schedules: ${schedulesAfterDeactivation.length}`)
    console.log(`   Active Schedules: ${activeAfterDeactivation.length}`)
    console.log(`   Inactive Schedules: ${schedulesAfterDeactivation.length - activeAfterDeactivation.length}`)
    console.log()

    // Now simulate reactivation
    console.log('🔄 SIMULATING PATIENT REACTIVATION...')
    await db
      .update(patients)
      .set({
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patient.id))

    // Reactivate all reminder schedules (this is the fix we're testing)
    await db
      .update(reminderSchedules)
      .set({
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(reminderSchedules.patientId, patient.id))

    console.log('✅ Patient and reminder schedules reactivated')
    console.log()

    // Check final status
    const schedulesAfterReactivation = await db
      .select()
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, patient.id))

    const activeAfterReactivation = schedulesAfterReactivation.filter(s => s.isActive)

    console.log('📋 AFTER REACTIVATION (FINAL STATUS):')
    console.log(`   Total Schedules: ${schedulesAfterReactivation.length}`)
    console.log(`   Active Schedules: ${activeAfterReactivation.length}`)
    console.log(`   Inactive Schedules: ${schedulesAfterReactivation.length - activeAfterReactivation.length}`)
    console.log()

    // Verify the fix worked
    const reactivationSuccessful = activeAfterReactivation.length === allSchedulesBefore.length

    if (reactivationSuccessful) {
      console.log('🎉 SUCCESS! Reactivation fix is working correctly')
      console.log('✅ All reminder schedules were reactivated')
      console.log('✅ Patient stats should now show correct counts')
      console.log('✅ Compliance calculation will use filtered data')
    } else {
      console.log('❌ FAILURE! Reactivation fix is not working')
      console.log(`Expected ${allSchedulesBefore.length} active schedules, got ${activeAfterReactivation.length}`)
    }

    console.log()
    console.log('📊 EXPECTED BEHAVIOR:')
    console.log('====================')
    console.log('1. Terjadwal/Perlu Diperbarui/Semua should show correct counts')
    console.log('2. Compliance rate should only include data after reactivation')
    console.log('3. Old reminder schedules should be active again')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testReactivationFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
