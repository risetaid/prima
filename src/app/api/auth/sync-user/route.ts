import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    })

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists in database',
        user: existingUser
      })
    }

    // Check if this is the first user (should be admin)
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumbers[0]?.phoneNumber || null,
        role: isFirstUser ? 'ADMIN' : 'MEMBER',
        isApproved: isFirstUser, // First user auto-approved
        approvedAt: isFirstUser ? new Date() : null,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'User synced successfully',
      user: newUser
    })
  } catch (error) {
    console.error('Sync user error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}