// Bun test: HealthNoteService permissions
import { HealthNoteService } from '../services/patient/health-note.service'

async function run() {
  const svc = new HealthNoteService()
  const patientId = process.env.TEST_PATIENT_ID
  const userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000'

  if (!patientId) {
    console.log('Set TEST_PATIENT_ID to run this smoke test')
    process.exit(0)
  }

  // Create a note
  const created = await svc.create(patientId, { note: 'Test catatan kesehatan', noteDate: new Date().toISOString() }, userId)
  console.log('Created note:', created.healthNote.id)

  // Update as same user (should pass)
  const updated = await svc.update(patientId, created.healthNote.id, { note: 'Update by owner', noteDate: new Date().toISOString() }, { id: userId, role: 'ADMIN' })
  console.log('Updated note text:', updated.healthNote.note)

  // Attempt delete as a different user without SUPERADMIN role (should fail)
  let unauthorizedFailed = false
  try {
    await svc.delete(patientId, created.healthNote.id, { id: 'someone-else', role: 'ADMIN' })
  } catch (e) {
    unauthorizedFailed = true
    console.log('Unauthorized delete blocked as expected')
  }

  if (!unauthorizedFailed) {
    console.error('Expected unauthorized delete to fail')
    process.exit(1)
  }

  // Delete as SUPERADMIN (should pass)
  const deleted = await svc.delete(patientId, created.healthNote.id, { id: 'someone-else', role: 'SUPERADMIN' })
  console.log('Deleted count:', deleted.deletedCount)
}

run().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})

