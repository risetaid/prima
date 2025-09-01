import { db, patients, reminderLogs, manualConfirmations, users } from './src/db'
import { eq } from 'drizzle-orm'

async function seedConfirmations() {
  console.log('🌱 Seeding manual confirmation data...')
  
  try {
    // Get existing patients and their reminder logs
    const existingPatients = await db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .limit(2)

    if (existingPatients.length === 0) {
      console.log('❌ No patients found. Run seed-patients-drizzle.ts first')
      return
    }

    // Get the volunteer user (created by seed-patients-drizzle.ts)
    const volunteer = await db
      .select({ id: users.id, firstName: users.firstName })
      .from(users)
      .limit(1)

    if (volunteer.length === 0) {
      console.log('❌ No volunteer found. Run seed-patients-drizzle.ts first')
      return
    }

    const volunteerId = volunteer[0].id

    // Get some reminder logs to confirm
    const reminderLogsToConfirm = await db
      .select({
        id: reminderLogs.id,
        patientId: reminderLogs.patientId,
        sentAt: reminderLogs.sentAt,
        message: reminderLogs.message
      })
      .from(reminderLogs)
      .limit(3)

    if (reminderLogsToConfirm.length === 0) {
      console.log('❌ No reminder logs found. Run seed-reminders-drizzle.ts first')
      return
    }

    console.log(`✅ Found ${existingPatients.length} patients and ${reminderLogsToConfirm.length} logs`)

    // Create manual confirmations - mix of linked to logs and general patient confirmations
    const testConfirmations = [
      // Confirmation linked to specific reminder log
      {
        patientId: reminderLogsToConfirm[0].patientId,
        volunteerId: volunteerId,
        reminderLogId: reminderLogsToConfirm[0].id,
        visitDate: new Date('2024-01-01'),
        visitTime: '09:00',
        medicationsTaken: true,
        medicationsMissed: [] as string[],
        patientCondition: 'GOOD' as 'GOOD' | 'FAIR' | 'POOR',
        symptomsReported: [] as string[],
        notes: 'Pasien sudah minum obat sesuai jadwal. Kondisi baik.',
        followUpNeeded: false
      },
      // General patient confirmation (not linked to specific log)
      {
        patientId: existingPatients[0].id,
        volunteerId: volunteerId,
        reminderLogId: null,
        visitDate: new Date('2024-01-02'),
        visitTime: '14:30',
        medicationsTaken: true,
        medicationsMissed: [] as string[],
        patientCondition: 'GOOD' as 'GOOD' | 'FAIR' | 'POOR',
        symptomsReported: [] as string[],
        notes: 'Kunjungan rutin. Pasien dalam kondisi stabil.',
        followUpNeeded: false
      }
    ]

    // Add confirmation for second patient if available
    if (existingPatients.length > 1 && reminderLogsToConfirm.length > 1) {
      testConfirmations.push({
        patientId: reminderLogsToConfirm[1].patientId,
        volunteerId: volunteerId,
        reminderLogId: reminderLogsToConfirm[1].id,
        visitDate: new Date('2024-01-03'),
        visitTime: '16:15',
        medicationsTaken: true,
        medicationsMissed: [] as string[],
        patientCondition: 'FAIR' as 'GOOD' | 'FAIR' | 'POOR',
        symptomsReported: ['mild fatigue'] as string[],
        notes: 'Obat berhasil diminum tepat waktu. Keluarga kooperatif.',
        followUpNeeded: true
      })
    }

    // Insert confirmations
    for (const confirmation of testConfirmations) {
      const result = await db.insert(manualConfirmations).values(confirmation).returning()
      console.log(`✅ Added confirmation: ID ${result[0].id} for patient ${confirmation.patientId}`)
      if (confirmation.reminderLogId) {
        console.log(`   - Linked to reminder log: ${confirmation.reminderLogId}`)
      } else {
        console.log(`   - General patient confirmation`)
      }
    }

    console.log('🎉 Manual confirmation data seeded successfully!')
    console.log(`📊 Created ${testConfirmations.length} manual confirmations`)
    console.log('📋 This will help test the stats API calculations for:')
    console.log('   - Completed reminders (with log confirmations)')
    console.log('   - Pending reminders (delivered but not confirmed)')
    console.log('   - Scheduled reminders (not yet sent)')
  } catch (error) {
    console.error('❌ Error seeding confirmations:', error)
  }
}

seedConfirmations().then(() => process.exit(0))