// Minimal Bun test for PatientService.getDetail
import { PatientService } from '@/services/patient/patient.service'

async function main() {
  const service = new PatientService()

  const patientId = process.argv[2]
  if (!patientId) {
    console.log('Usage: bun run src/tests/patient-detail.smoke.ts <PATIENT_ID>')
    process.exit(1)
  }

  try {
    const detail = await service.getDetail(patientId)
    // Print a small subset to verify shape
    console.log('id:', detail.id)
    console.log('name:', detail.name)
    console.log('isActive:', detail.isActive)
    console.log('complianceRate:', detail.complianceRate)
    console.log('manualConfirmations:', detail.manualConfirmations?.length || 0)
    console.log('reminderLogs:', detail.reminderLogs?.length || 0)
    console.log('patientMedications:', detail.patientMedications?.length || 0)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()


