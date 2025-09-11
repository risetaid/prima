// Variables service for patient domain
import { PatientRepository } from './patient.repository'
import { PatientVariablesResponse, ValidationError, NotFoundError } from './patient.types'
import { CACHE_KEYS, getCachedData, setCachedData } from '@/lib/cache'

export class VariablesService {
  private repo: PatientRepository
  constructor() {
    this.repo = new PatientRepository()
  }

  async get(patientId: string): Promise<PatientVariablesResponse> {
    if (!patientId) throw new ValidationError('Missing patientId')

    // Optional cache layer (can be refined later)
    const cacheKey = `${CACHE_KEYS.patient(patientId)}:variables`
    const cached = await getCachedData(cacheKey)
    if (cached) return cached as PatientVariablesResponse

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    const list = await this.repo.getActiveVariables(patientId)
    const map = list.reduce((acc, v) => {
      acc[v.variableName] = v.variableValue
      return acc
    }, {} as Record<string, string>)

    const response: PatientVariablesResponse = {
      success: true,
      patientId,
      variables: map,
      variablesList: list.map(v => ({
        id: v.id,
        variableName: v.variableName,
        variableValue: v.variableValue,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
      count: list.length,
    }

    await setCachedData(cacheKey, response, 300)
    return response
  }

  async upsertMany(patientId: string, variables: Record<string, string>, createdById: string): Promise<PatientVariablesResponse> {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!variables || typeof variables !== 'object') throw new ValidationError('Variables object is required')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    await this.repo.upsertVariables(patientId, variables, createdById)

    // Return fresh state
    return await this.get(patientId)
  }

  async delete(patientId: string, variableName: string): Promise<{ success: true; deletedCount: number }> {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!variableName) throw new ValidationError('variableName parameter is required')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    const deletedCount = await this.repo.softDeleteVariable(patientId, variableName)
    return { success: true, deletedCount }
  }
}

