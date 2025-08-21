import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; symptomId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, symptomId } = await params
    const { symptomText, recordedAt } = await request.json()

    if (!symptomText || !recordedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify symptom exists and belongs to the patient
    const existingSymptom = await prisma.patientSymptom.findUnique({
      where: { 
        id: symptomId,
        patientId: id
      }
    })

    if (!existingSymptom) {
      return NextResponse.json({ error: 'Symptom not found' }, { status: 404 })
    }

    // Update the symptom
    const updatedSymptom = await prisma.patientSymptom.update({
      where: { id: symptomId },
      data: {
        symptomText,
        recordedAt: new Date(recordedAt)
      }
    })

    return NextResponse.json(updatedSymptom)
  } catch (error) {
    console.error('Error updating symptom:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; symptomId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, symptomId } = await params
    // Verify symptom exists and belongs to the patient
    const existingSymptom = await prisma.patientSymptom.findUnique({
      where: { 
        id: symptomId,
        patientId: id
      }
    })

    if (!existingSymptom) {
      return NextResponse.json({ error: 'Symptom not found' }, { status: 404 })
    }

    // Delete the symptom
    await prisma.patientSymptom.delete({
      where: { id: symptomId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting symptom:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}