// Minimal Bun test for PatientService.getDetail
import { PatientService } from '@/services/patient/patient.service'
import { logger } from '@/lib/logger'

async function main() {
  const service = new PatientService()

  const patientId = process.argv[2]
  if (!patientId) {
    logger.info('Usage: bun run src/tests/patient-detail.smoke.ts <PATIENT_ID>')
    process.exit(1)
  }

  try {
    const detail = await service.getDetail(patientId)
    // Print a small subset to verify shape
    logger.info(`id: ${detail.id}`)
    logger.info(`name: ${detail.name}`)
    logger.info(`isActive: ${detail.isActive}`)
    logger.info(`complianceRate: ${detail.complianceRate}`)
    logger.info(`manualConfirmations: ${detail.manualConfirmations?.length || 0}`)
    logger.info(`reminderLogs: ${detail.reminderLogs?.length || 0}`)
    process.exit(0)
  } catch (err) {
    logger.error('Error', err instanceof Error ? err : new Error(String(err)))
    process.exit(1)
  }
}

main()


