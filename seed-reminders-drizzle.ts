import { db, patients, reminderSchedules, reminderLogs } from './src/db'
import { eq } from 'drizzle-orm'

async function seedReminders() {
  console.log('🌱 Seeding reminder data...')
  
  try {
    // Get existing patients
    const existingPatients = await db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .limit(2)

    if (existingPatients.length === 0) {
      console.log('❌ No patients found. Run seed-patients-drizzle.ts first')
      return
    }

    console.log(`✅ Found ${existingPatients.length} patients`)

    // Create test reminder schedules
    const testReminders = [
      {
        patientId: existingPatients[0].id,
        medicationName: 'Candesartan',
        dosage: '8mg',
        doctorName: 'Dr. Prima Volunteer',
        scheduledTime: '08:00',
        frequency: 'CUSTOM' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        customMessage: `Selamat pagi ${existingPatients[0].name}! Saatnya minum obat Candesartan 8mg ya. Jangan lupa minum dengan air putih. Semangat!`,
        isActive: true,
        createdById: '00000000-0000-0000-0000-000000000001'
      },
      {
        patientId: existingPatients[0].id,
        medicationName: 'Paracetamol',
        dosage: '500mg',
        doctorName: 'Dr. Prima Volunteer',
        scheduledTime: '20:00',
        frequency: 'CUSTOM' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        customMessage: `Halo ${existingPatients[0].name}! Waktu minum Paracetamol 500mg malam hari. Istirahat yang cukup ya!`,
        isActive: true,
        createdById: '00000000-0000-0000-0000-000000000001'
      }
    ]

    // Add second patient reminder if available
    if (existingPatients.length > 1) {
      testReminders.push({
        patientId: existingPatients[1].id,
        medicationName: 'Metformin',
        dosage: '500mg',
        doctorName: 'Dr. Prima Volunteer',
        scheduledTime: '07:30',
        frequency: 'CUSTOM' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        customMessage: `Selamat pagi ${existingPatients[1].name}! Saatnya minum Metformin 500mg sebelum sarapan. Jaga pola makan ya!`,
        isActive: true,
        createdById: '00000000-0000-0000-0000-000000000001'
      })
    }

    // Insert reminders
    const insertedReminders = []
    for (const reminder of testReminders) {
      const result = await db.insert(reminderSchedules).values(reminder).returning()
      insertedReminders.push(result[0])
      console.log(`✅ Added reminder: ${result[0].medicationName} for ${reminder.patientId}`)
    }

    // Create sample reminder logs
    const sampleLogs = [
      {
        reminderScheduleId: insertedReminders[0].id,
        patientId: insertedReminders[0].patientId,
        sentAt: new Date('2024-01-01T08:00:00Z'),
        status: 'DELIVERED' as const,
        message: insertedReminders[0].customMessage || 'Reminder message',
        phoneNumber: '+6281234567890',
        fonnteMessageId: 'fonnte-msg-001'
      },
      {
        reminderScheduleId: insertedReminders[0].id,
        patientId: insertedReminders[0].patientId,
        sentAt: new Date('2024-01-02T08:00:00Z'),
        status: 'DELIVERED' as const,
        message: insertedReminders[0].customMessage || 'Reminder message',
        phoneNumber: '+6281234567890',
        fonnteMessageId: 'fonnte-msg-002'
      }
    ]

    for (const log of sampleLogs) {
      await db.insert(reminderLogs).values(log)
      console.log(`✅ Added reminder log: ${log.fonnteMessageId}`)
    }

    console.log('🎉 Reminder data seeded successfully!')
    console.log(`📊 Created ${insertedReminders.length} reminder schedules`)
    console.log(`📊 Created ${sampleLogs.length} reminder logs`)
  } catch (error) {
    console.error('❌ Error seeding reminders:', error)
  }
}

seedReminders().then(() => process.exit(0))