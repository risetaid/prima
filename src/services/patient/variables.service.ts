// Variables service for patient domain
import { PatientRepository } from './patient.repository'
import { ValidationError, NotFoundError } from './patient.types'
// Cache imports removed - functionality disabled

// Type for patient variables response since it's no longer in the DB schema
export interface PatientVariablesResponse {
  success: boolean
  patientId: string
  variables: Record<string, string>
  variablesList: Array<{
    id: string
    variableName: string
    variableValue: string
    createdAt: Date
    updatedAt: Date
  }>
  count: number
}

export class VariablesService {
  private repo: PatientRepository
  constructor() {
    this.repo = new PatientRepository()
  }

  async get(patientId: string): Promise<PatientVariablesResponse> {
    if (!patientId) throw new ValidationError('Missing patientId')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    // Variables table was removed from the schema, return empty response
    const response: PatientVariablesResponse = {
      success: true,
      patientId,
      variables: {},
      variablesList: [],
      count: 0,
    }

    return response
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upsertMany(patientId: string, variables: Record<string, string>, _createdById: string): Promise<PatientVariablesResponse> {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!variables || typeof variables !== 'object') throw new ValidationError('Variables object is required')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    // Variables table was removed, just return empty response
    // Note: _createdById would have been used for audit trail in original implementation
    return await this.get(patientId)
  }

  async delete(patientId: string, variableName: string): Promise<{ success: true; deletedCount: number }> {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!variableName) throw new ValidationError('variableName parameter is required')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    // Variables table was removed, return 0 deleted count
    return { success: true, deletedCount: 0 }
  }
}


