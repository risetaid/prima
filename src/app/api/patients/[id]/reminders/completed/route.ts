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
        },
        reminderLog: {
          include: {
            reminderSchedule: {
              select: {
                customMessage: true,
                medicationName: true
              }
            }
          }
        }
      },
      orderBy: {
        visitDate: 'desc'
      }
    })

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(confirmation => {
      // Get original custom message from reminder schedule if available
      const originalMessage = confirmation.reminderLog?.reminderSchedule?.customMessage
      const medicationName = confirmation.reminderLog?.reminderSchedule?.medicationName || 
                            (confirmation.medicationsMissed.length > 0 ? confirmation.medicationsMissed[0] : 'candesartan')
      
      return {
        id: confirmation.id,
        medicationName,
        scheduledTime: confirmation.visitTime,
        completedDate: confirmation.visitDate.toISOString().split('T')[0],
        customMessage: originalMessage || `Minum obat ${medicationName}`,
        medicationTaken: confirmation.medicationsTaken,
        confirmedAt: confirmation.confirmedAt.toISOString()
      }
    })

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}