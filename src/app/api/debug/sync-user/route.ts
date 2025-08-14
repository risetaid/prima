import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug routes disabled in production' }, { status: 404 })
  }

  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 })
    }

    // Manually sync current user to database
    const dbUser = await prisma.user.upsert({
      where: { clerkId: user.id },
      update: {
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumbers[0]?.phoneNumber || null,
      },
      create: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumbers[0]?.phoneNumber || null,
        role: 'VOLUNTEER',
      },
    })

    return NextResponse.json({
      message: 'User synced successfully',
      user: dbUser,
    })
  } catch (error) {
    console.error('Sync user error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user', details: error },
      { status: 500 }
    )
  }
}