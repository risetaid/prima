import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db, healthNotes, users, patients } from '@/db'
import { eq, and } from 'drizzle-orm'

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

    // Get health note with separate queries for user and patient data
    const healthNoteResult = await db
      .select({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt
      })
      .from(healthNotes)
      .innerJoin(patients, and(
        eq(healthNotes.patientId, patients.id),
        eq(patients.isActive, true)
      ))
      .where(
        and(
          eq(healthNotes.id, noteId),
          eq(healthNotes.patientId, patientId)
        )
      )
      .limit(1)

    if (healthNoteResult.length === 0) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    const healthNoteData = healthNoteResult[0]

    // Get user details
    const userResult = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, healthNoteData.recordedBy))
      .limit(1)

    // Get patient details
    const patientResult = await db
      .select({
        id: patients.id,
        name: patients.name
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    const healthNote = {
      ...healthNoteData,
      recordedByUser: userResult.length > 0 ? userResult[0] : null,
      patient: patientResult.length > 0 ? patientResult[0] : null
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
    const existingNoteResult = await db
      .select({
        id: healthNotes.id,
        recordedBy: healthNotes.recordedBy
      })
      .from(healthNotes)
      .innerJoin(patients, and(
        eq(healthNotes.patientId, patients.id),
        eq(patients.isActive, true)
      ))
      .where(
        and(
          eq(healthNotes.id, noteId),
          eq(healthNotes.patientId, patientId)
        )
      )
      .limit(1)

    if (existingNoteResult.length === 0) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    const existingNote = existingNoteResult[0]

    // Only allow the original recorder or admin to edit
    if (existingNote.recordedBy !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'You can only edit notes you created' },
        { status: 403 }
      )
    }

    // Update health note
    const updatedResult = await db
      .update(healthNotes)
      .set({
        note: note.trim(),
        noteDate: new Date(noteDate)
      })
      .where(eq(healthNotes.id, noteId))
      .returning({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt
      })

    const updatedData = updatedResult[0]

    // Get user details for response
    const userResult = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, updatedData.recordedBy))
      .limit(1)

    const updatedHealthNote = {
      ...updatedData,
      recordedByUser: userResult.length > 0 ? userResult[0] : null
    }

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
    const existingNoteResult = await db
      .select({
        id: healthNotes.id,
        recordedBy: healthNotes.recordedBy
      })
      .from(healthNotes)
      .innerJoin(patients, and(
        eq(healthNotes.patientId, patients.id),
        eq(patients.isActive, true)
      ))
      .where(
        and(
          eq(healthNotes.id, noteId),
          eq(healthNotes.patientId, patientId)
        )
      )
      .limit(1)

    if (existingNoteResult.length === 0) {
      return NextResponse.json({ error: 'Health note not found' }, { status: 404 })
    }

    const existingNote = existingNoteResult[0]

    // Only allow the original recorder or admin to delete
    if (existingNote.recordedBy !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'You can only delete notes you created' },
        { status: 403 }
      )
    }

    // Delete health note
    await db
      .delete(healthNotes)
      .where(eq(healthNotes.id, noteId))

    return NextResponse.json({ message: 'Health note deleted successfully' })
    
  } catch (error) {
    console.error('Error deleting health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}