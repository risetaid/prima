import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth-utils'

const prisma = new PrismaClient()

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

    // Validation
    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { error: 'Note IDs are required' },
        { status: 400 }
      )
    }

    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isActive: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Check if all notes exist and belong to this patient
    const existingNotes = await prisma.healthNote.findMany({
      where: {
        id: { in: noteIds },
        patientId: patientId
      }
    })

    if (existingNotes.length !== noteIds.length) {
      return NextResponse.json(
        { error: 'Some health notes not found' },
        { status: 404 }
      )
    }

    // Check permissions - only allow deletion of own notes (unless admin)
    const unauthorizedNotes = existingNotes.filter(
      note => note.recordedBy !== user.id && user.role !== 'ADMIN'
    )

    if (unauthorizedNotes.length > 0) {
      return NextResponse.json(
        { error: 'You can only delete notes you created' },
        { status: 403 }
      )
    }

    // Delete the notes
    const deleteResult = await prisma.healthNote.deleteMany({
      where: {
        id: { in: noteIds },
        patientId: patientId
      }
    })

    return NextResponse.json({
      message: `${deleteResult.count} health notes deleted successfully`,
      deletedCount: deleteResult.count
    })
    
  } catch (error) {
    console.error('Error bulk deleting health notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}