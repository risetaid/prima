// Bun test: PatientService CRUD (create, update, delete, reactivate)
import { PatientService } from '@/services/patient/patient.service'

async function run() {
  const service = new PatientService()

  // Mock current user
  const currentUser = { id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000', role: 'ADMIN' }

  // 1) Create
  const created = await service.createPatient({
    name: `Test User ${Date.now()}`,
    phoneNumber: '081234567890',
    cancerStage: 'I'
  }, currentUser)
  console.log('Created:', created.id)

  // 2) Update
  const updated = await service.updatePatient(created.id, { address: 'Jl. Test 123' })
  console.log('Updated address:', updated.address)

  // 3) Reactivate (should be safe even if already active)
  const reactivated = await service.reactivatePatient(created.id, { id: currentUser.id, email: 'test@example.com' })
  console.log('Reactivated status:', reactivated.newStatus)

  // 4) Delete
  const deleted = await service.deletePatient(created.id)
  console.log('Deleted at:', deleted.deletedAt)
}

run().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})


