import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

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
    const patientMedications = await prisma.patientMedication.findMany({
      where: {
        patientId: id,
        isActive: true
      },
      include: {
        medication: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(patientMedications)
  } catch (error) {
    console.error('Error fetching patient medications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}