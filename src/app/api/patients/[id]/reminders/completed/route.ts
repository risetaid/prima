import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Get completed reminders (those with manual confirmations)
    const completedReminders = await prisma.manualConfirmation.findMany({
      where: {
        patientId: id
      },
      include: {
        patient: {
          select: {
            name: true,
            phoneNumber: true
          }
        },
        volunteer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        visitDate: 'desc'
      }
    })

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(confirmation => ({
      id: confirmation.id,
      medicationName: confirmation.medicationsMissed.length > 0 
        ? confirmation.medicationsMissed[0] 
        : 'candesartan',
      scheduledTime: confirmation.visitTime,
      completedDate: confirmation.visitDate.toISOString().split('T')[0],
      customMessage: `Minum obat ${confirmation.medicationsMissed.length > 0 
        ? confirmation.medicationsMissed[0] 
        : 'candesartan'}`,
      medicationTaken: confirmation.medicationsTaken,
      confirmedAt: confirmation.confirmedAt.toISOString()
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}