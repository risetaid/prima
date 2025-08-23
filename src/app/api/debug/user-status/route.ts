import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      return NextResponse.json({ error: 'No Clerk user' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id }
    })

    // Get total user count
    const totalUsers = await prisma.user.count()

    return NextResponse.json({
      clerk: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        createdAt: clerkUser.createdAt
      },
      database: dbUser ? {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        role: dbUser.role,
        isApproved: dbUser.isApproved,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt
      } : null,
      totalUsers,
      shouldBeFirstUser: totalUsers === 0,
      userExists: !!dbUser
    })
  } catch (error) {
    console.error('Debug user status error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}