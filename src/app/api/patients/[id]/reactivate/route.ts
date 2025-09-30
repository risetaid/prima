import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { PatientService } from '@/services/patient/patient.service'

import { logger } from '@/lib/logger';
// Reactivate patient after BERHENTI (unsubscribe)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    const service = new PatientService()
    const result = await service.reactivatePatient(patientId, { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email })

    return NextResponse.json(result)

  } catch (error: unknown) {
    logger.error('Reactivation error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
