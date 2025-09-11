import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { HealthNoteService } from '@/services/patient/health-note.service'
import { PatientError } from '@/services/patient/patient.types'

const healthNoteService = new HealthNoteService()

// GET /api/patients/[id]/health-notes/[noteId] - Get specific health note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await requireAuth()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId, noteId } = await params

    const note = await healthNoteService.get(patientId, noteId)
    return NextResponse.json({ healthNote: note })
    
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/patients/[id]/health-notes/[noteId] - Update health note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await requireAuth()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId, noteId } = await params
    const body = await request.json()

    const result = await healthNoteService.update(patientId, noteId, body, { id: user.id, role: user.role })
    return NextResponse.json(result)
    
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]/health-notes/[noteId] - Delete health note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await requireAuth()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId, noteId } = await params

    const result = await healthNoteService.delete(patientId, noteId, { id: user.id, role: user.role })
    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
