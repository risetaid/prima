import { NextRequest, NextResponse } from 'next/server'
import { currentUser, auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const debugType = searchParams.get('type') || 'user'

  if (debugType === 'email') {
    return await debugEmail()
  } else if (debugType === 'user') {
    return await debugUser()
  }

  return NextResponse.json({ 
    error: 'Invalid debug type. Use ?type=email or ?type=user' 
  }, { status: 400 })
}

async function debugEmail() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress || ''

    const userByClerkId = await prisma.user.findUnique({
      where: { clerkId: user.id }
    })

    const userByEmail = await prisma.user.findUnique({
      where: { email: email }
    })

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

async function debugUser() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

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