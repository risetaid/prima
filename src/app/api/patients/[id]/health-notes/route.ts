import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth-utils'

const prisma = new PrismaClient()

// GET /api/patients/[id]/health-notes - Get all health notes for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists and user has access
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isActive: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get health notes for the patient, ordered by noteDate descending
    const healthNotes = await prisma.healthNote.findMany({
      where: {
        patientId: patientId
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
      },
      orderBy: {
        noteDate: 'desc'
      }
    })

    return NextResponse.json({ healthNotes })
    
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
    const user = await requireAuth()
    
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
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isActive: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Create health note
    const healthNote = await prisma.healthNote.create({
      data: {
        patientId: patientId,
        note: note.trim(),
        noteDate: new Date(noteDate),
        recordedBy: user.id
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

    return NextResponse.json({ healthNote }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating health note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}