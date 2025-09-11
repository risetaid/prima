// Bun test: ComplianceService attach & single rate
import { ComplianceService } from '@/services/patient/compliance.service'

async function run() {
  const svc = new ComplianceService()

  // Provide known/real patient IDs for best results, or leave empty to no-op
  const ids = (process.env.TEST_PATIENT_IDS || '').split(',').filter(Boolean)
  if (ids.length === 0) {
    console.log('No TEST_PATIENT_IDS env provided, skipping attachCompliance smoke test')
    process.exit(0)
  }

  const dummy = ids.map(id => ({ id }))
  const withRates = await svc.attachCompliance(dummy)
  console.log('Rates for', ids.length, 'patients:')
  withRates.forEach(p => console.log(p.id, p.complianceRate))

  // Test single patient rate for the first id
  const rate = await svc.getPatientRate(ids[0])
  console.log('Single rate for', ids[0], ':', rate)
}

run().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})


