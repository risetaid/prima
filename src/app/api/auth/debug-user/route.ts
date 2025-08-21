import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    // Get all users count
    const totalUsers = await prisma.user.count()

    return NextResponse.json({
      clerkUserId: userId,
      userFoundInDb: !!user,
      userDetails: user,
      totalUsersInDb: totalUsers
    })
  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}