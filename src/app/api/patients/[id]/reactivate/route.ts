import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { PatientService } from '@/services/patient/patient.service'

// POST /api/patients/[id]/reactivate - Reactivate patient after BERHENTI (unsubscribe)
export const POST = createApiHandler(
  { auth: "required", params: schemas.patientIdParam },
  async (_, { user, params }) => {
    const { id: patientId } = params!

    const service = new PatientService()
    const result = await service.reactivatePatient(patientId, {
      id: user!.id,
      firstName: user!.firstName,
      lastName: user!.lastName,
      email: user!.email
    })

    return result
  }
);
