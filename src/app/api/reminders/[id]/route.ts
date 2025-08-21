import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reminder = await prisma.reminderSchedule.findUnique({
      where: { id: params.id },
      include: {
        patientMedication: {
          include: {
            patient: true,
            medication: true
          }
        },
        reminderLogs: {
          orderBy: { createdAt: 'desc' }
        },
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error fetching reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      messageTemplate,
      timeOfDay,
      daysOfWeek,
      educationLink,
      isActive
    } = body

    const reminder = await prisma.reminderSchedule.update({
      where: { id: params.id },
      data: {
        messageTemplate,
        timeOfDay,
        daysOfWeek,
        educationLink,
        isActive
      },
      include: {
        patientMedication: {
          include: {
            patient: true,
            medication: true
          }
        }
      }
    })

    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete by setting isActive to false
    const reminder = await prisma.reminderSchedule.update({
      where: { id: params.id },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({ 
      message: 'Reminder deleted successfully',
      id: reminder.id 
    })
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}