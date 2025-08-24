import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const symptoms = await prisma.patientSymptom.findMany({
      where: {
        patientId: id
      },
      orderBy: {
        recordedAt: 'desc'
      }
    })

    return NextResponse.json(symptoms)
  } catch (error) {
    console.error('Error fetching symptoms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { symptomText, recordedAt } = await request.json()

    if (!symptomText || !recordedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const symptom = await prisma.patientSymptom.create({
      data: {
        patientId: id,
        symptomText,
        recordedAt: new Date(recordedAt)
      }
    })

    return NextResponse.json(symptom)
  } catch (error) {
    console.error('Error creating symptom:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { symptomIds } = await request.json()

    if (!symptomIds || !Array.isArray(symptomIds)) {
      return NextResponse.json({ error: 'Invalid symptomIds' }, { status: 400 })
    }

    await prisma.patientSymptom.deleteMany({
      where: {
        id: { in: symptomIds },
        patientId: id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting symptoms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}