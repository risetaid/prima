import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { HealthNoteService } from '@/services/patient/health-note.service'
import { PatientError } from '@/services/patient/patient.types'

const healthNoteService = new HealthNoteService()

// POST /api/patients/[id]/health-notes/bulk-delete - Delete multiple health notes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params
    const body = await request.json()
    const { noteIds } = body

    const result = await healthNoteService.bulkDelete(patientId, noteIds, { id: user.id, role: user.role })
    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
