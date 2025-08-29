import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth-utils'

const prisma = new PrismaClient()

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

    // Get health note with user verification
    const healthNote = await prisma.healthNote.findFirst({
      where: {
        id: noteId,
        patientId: patientId,
        patient: {
          isActive: true
        }
      },
      include: {
        recordedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!healthNote) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    return NextResponse.json({ healthNote })
    
  } catch (error) {
    console.error('Error fetching health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    const { note, noteDate } = body

    // Validation
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    if (!noteDate || typeof noteDate !== 'string') {
      return NextResponse.json(
        { error: 'Note date is required' },
        { status: 400 }
      )
    }

    // Check if health note exists and user has permission to edit
    const existingNote = await prisma.healthNote.findFirst({
      where: {
        id: noteId,
        patientId: patientId,
        patient: {
          isActive: true
        }
      }
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    // Only allow the original recorder or admin to edit
    if (existingNote.recordedBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only edit notes you created' },
        { status: 403 }
      )
    }

    // Update health note
    const updatedHealthNote = await prisma.healthNote.update({
      where: {
        id: noteId
      },
      data: {
        note: note.trim(),
        noteDate: new Date(noteDate)
      },
      include: {
        recordedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ healthNote: updatedHealthNote })
    
  } catch (error) {
    console.error('Error updating health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    // Check if health note exists and user has permission to delete
    const existingNote = await prisma.healthNote.findFirst({
      where: {
        id: noteId,
        patientId: patientId,
        patient: {
          isActive: true
        }
      }
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    // Only allow the original recorder or admin to delete
    if (existingNote.recordedBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only delete notes you created' },
        { status: 403 }
      )
    }

    // Delete health note
    await prisma.healthNote.delete({
      where: {
        id: noteId
      }
    })

    return NextResponse.json({ message: 'Health note deleted successfully' })
    
  } catch (error) {
    console.error('Error deleting health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}