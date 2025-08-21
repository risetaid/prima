import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { medicationTaken } = await request.json()

    if (typeof medicationTaken !== 'boolean') {
      return NextResponse.json({ error: 'medicationTaken must be boolean' }, { status: 400 })
    }

    const { id, reminderId } = await params
    // Get current user from database
    const user = await prisma.user.findFirst({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the reminder log to find the related schedule
    const reminderLog = await prisma.reminderLog.findUnique({
      where: { 
        id: reminderId,
        patientId: id
      },
      include: {
        reminderSchedule: true
      }
    })

    if (!reminderLog) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    // Create manual confirmation
    const manualConfirmation = await prisma.manualConfirmation.create({
      data: {
        patientId: id,
        volunteerId: user.id,
        visitDate: new Date(),
        visitTime: new Date().toTimeString().slice(0, 5), // HH:MM format
        medicationsTaken: medicationTaken,
        medicationsMissed: medicationTaken ? [] : [reminderLog.reminderSchedule?.medicationName || 'Obat'],
        patientCondition: 'FAIR', // Default, could be made dynamic
        symptomsReported: [],
        notes: `Manual confirmation for reminder: ${reminderLog.message}`,
        followUpNeeded: !medicationTaken,
        followUpNotes: medicationTaken ? null : 'Patient did not take medication as scheduled'
      }
    })

    return NextResponse.json(manualConfirmation)
  } catch (error) {
    console.error('Error confirming reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}