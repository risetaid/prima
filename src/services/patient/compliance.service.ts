// ComplianceService centralizes compliance calculations for patients
import { PatientRepository } from './patient.repository'

export class ComplianceService {
  private repo: PatientRepository
  constructor() {
    this.repo = new PatientRepository()
  }

  // Compute compliance rate = confirmations / delivered * 100 (integer percent)
  private computeRate(delivered: number, confirmations: number): number {
    if (!delivered || delivered <= 0) return 0
    const rate = Math.round((confirmations / delivered) * 100)
    return Math.max(0, Math.min(100, rate))
  }

  async getRatesMap(patientIds: string[]) {
    const [delivered, confirmations] = await Promise.all([
      this.repo.getDeliveredCounts(patientIds),
      this.repo.getConfirmationsCounts(patientIds),
    ])

    const deliveredMap = new Map<string, number>()
    for (const row of delivered) deliveredMap.set(row.patientId, row.count)

    const confirmationsMap = new Map<string, number>()
    for (const row of confirmations) confirmationsMap.set(row.patientId, row.count)

    const rateMap = new Map<string, number>()
    for (const id of patientIds) {
      const d = deliveredMap.get(id) || 0
      const c = confirmationsMap.get(id) || 0
      rateMap.set(id, this.computeRate(d, c))
    }

    return { deliveredMap, confirmationsMap, rateMap }
  }

  async attachCompliance<T extends { id: string }>(patients: T[]): Promise<(T & { complianceRate: number })[]> {
    const ids = patients.map(p => p.id)
    const { rateMap } = await this.getRatesMap(ids)
    return patients.map(p => ({ ...p, complianceRate: rateMap.get(p.id) || 0 }))
  }

  async getPatientRate(patientId: string): Promise<number> {
    const { rateMap } = await this.getRatesMap([patientId])
    return rateMap.get(patientId) || 0
  }
}

