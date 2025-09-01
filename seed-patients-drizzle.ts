import { db, patients, users } from './src/db'

async function seedPatients() {
  console.log('🌱 Seeding patient data...')
  
  try {
    // First create a dummy user (volunteer)
    const volunteer = await db.insert(users).values({
      email: 'volunteer@prima.com',
      firstName: 'Dr. Volunteer',
      lastName: 'Prima',
      clerkId: 'dummy-volunteer-clerk-id',
      role: 'MEMBER',
      isActive: true,
      isApproved: true
    }).returning()

    console.log('✅ Created volunteer:', volunteer[0].firstName)

    // Create test patients
    const testPatients = [
      {
        name: 'Budi Santoso',
        phoneNumber: '+6281234567890',
        address: 'Jl. Sudirman No. 123, Jakarta',
        birthDate: new Date('1975-05-15'),
        diagnosisDate: new Date('2023-01-10'),
        cancerStage: 'II' as const,
        assignedVolunteerId: volunteer[0].id,
        emergencyContactName: 'Siti Santoso',
        emergencyContactPhone: '+6281234567891',
        notes: 'Pasien kooperatif, rutin kontrol',
        isActive: true
      },
      {
        name: 'Ani Wijaya',
        phoneNumber: '+6281234567892',
        address: 'Jl. Thamrin No. 456, Jakarta',
        birthDate: new Date('1980-08-20'),
        diagnosisDate: new Date('2023-03-15'),
        cancerStage: 'I' as const,
        assignedVolunteerId: volunteer[0].id,
        emergencyContactName: 'Eko Wijaya',
        emergencyContactPhone: '+6281234567893',
        notes: 'Pasien memerlukan perhatian khusus',
        isActive: true
      }
    ]

    for (const patient of testPatients) {
      const result = await db.insert(patients).values(patient).returning()
      console.log(`✅ Added patient: ${result[0].name} (ID: ${result[0].id})`)
    }

    console.log('🎉 Patient data seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding patients:', error)
  }
}

seedPatients().then(() => process.exit(0))