import { NextRequest, NextResponse } from 'next/server'
import { requireApprovedUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireApprovedUser()
    
    // Get scheduled reminders for current user's patients
    const scheduledReminders = await prisma.reminderSchedule.findMany({
      where: {
        patient: {
          assignedVolunteerId: user.role === 'ADMIN' ? undefined : user.id,
          deletedAt: null
        },
        isActive: true
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        scheduledTime: 'asc'
      }
    })

    return NextResponse.json(scheduledReminders)
  } catch (error) {
    console.error('Error fetching scheduled reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reminders' },
      { status: 500 }
    )
  }
}