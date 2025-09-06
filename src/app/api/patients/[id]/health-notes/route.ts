import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db, patients, healthNotes, users } from '@/db'
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm'

// GET /api/patients/[id]/health-notes - Get all health notes for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists and user has access
    // Note: Allow health notes access for inactive patients (BERHENTI) too
    const patient = await db
      .select({
        id: patients.id,
        name: patients.name,
        isActive: patients.isActive
      })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1)

    if (patient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get health notes for the patient using separate optimized queries
    const patientHealthNotes = await db
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
      .where(eq(healthNotes.patientId, patientId))
      .orderBy(desc(healthNotes.noteDate))

    // Get user details for all health notes
    const userIds = [...new Set(patientHealthNotes.map(hn => hn.recordedBy))]
    
    const userDetails = userIds.length > 0 ? await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(inArray(users.id, userIds)) : []

    // Create user lookup map
    const userMap = new Map()
    userDetails.forEach(user => {
      userMap.set(user.id, user)
    })

    // Format response to match Prisma structure
    const formattedHealthNotes = patientHealthNotes.map(hn => ({
      id: hn.id,
      patientId: hn.patientId,
      note: hn.note,
      noteDate: hn.noteDate,
      recordedBy: hn.recordedBy,
      createdAt: hn.createdAt,
      updatedAt: hn.updatedAt,
      recordedByUser: userMap.get(hn.recordedBy) || null
    }))

    return NextResponse.json({ healthNotes: formattedHealthNotes })
    
  } catch (error) {
    console.error('Error fetching health notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/patients/[id]/health-notes - Create a new health note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params
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

    // Verify patient exists and user has access
    // Note: Allow health notes access for inactive patients (BERHENTI) too
    const patient = await db
      .select({
        id: patients.id,
        name: patients.name,
        isActive: patients.isActive
      })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1)

    if (patient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Create health note
    const newHealthNote = await db
      .insert(healthNotes)
      .values({
        patientId: patientId,
        note: note.trim(),
        noteDate: new Date(noteDate),
        recordedBy: user.id
      })
      .returning({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt
      })

    const createdHealthNote = newHealthNote[0]

    // Get user details for the created health note
    const userDetails = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    // Format response to match Prisma structure
    const formattedHealthNote = {
      id: createdHealthNote.id,
      patientId: createdHealthNote.patientId,
      note: createdHealthNote.note,
      noteDate: createdHealthNote.noteDate,
      recordedBy: createdHealthNote.recordedBy,
      createdAt: createdHealthNote.createdAt,
      updatedAt: createdHealthNote.updatedAt,
      recordedByUser: userDetails.length > 0 ? userDetails[0] : null
    }

    return NextResponse.json({ healthNote: formattedHealthNote }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}