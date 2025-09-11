// MedicationService centralizes listing patient medications
import { PatientRepository } from './patient.repository'
import { ValidationError, NotFoundError } from './patient.types'

export class MedicationService {
  private repo: PatientRepository
  constructor() {
    this.repo = new PatientRepository()
  }

  async listActive(patientId: string) {
    if (!patientId) throw new ValidationError('Missing patientId')
    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    const rows = await this.repo.listActiveMedications(patientId)
    return rows.map(pm => ({
      id: pm.id,
      patientId: pm.patientId,
      medicationId: pm.medicationId,
      dosage: pm.dosage,
      frequency: pm.frequency,
      instructions: pm.instructions,
      startDate: pm.startDate,
      endDate: pm.endDate,
      isActive: pm.isActive,
      createdAt: pm.createdAt,
      medication: pm.medicationName ? { id: pm.medicationId, name: pm.medicationName } : null,
    }))
  }
}


