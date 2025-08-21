import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress || ''

    // Check for user by clerkId
    const userByClerkId = await prisma.user.findUnique({
      where: { clerkId: user.id }
    })

    // Check for user by email
    const userByEmail = await prisma.user.findUnique({
      where: { email: email }
    })

    // Get all users with same email
    const allUsersWithEmail = await prisma.user.findMany({
      where: { email: email },
      select: { id: true, clerkId: true, email: true, firstName: true, lastName: true, createdAt: true }
    })

    return NextResponse.json({
      currentClerkId: user.id,
      currentEmail: email,
      userByClerkId,
      userByEmail,
      allUsersWithEmail,
      conflict: userByEmail && userByEmail.clerkId !== user.id
    })
  } catch (error) {
    console.error('Debug email error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}