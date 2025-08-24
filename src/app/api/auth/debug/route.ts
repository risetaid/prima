import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
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
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.primaryEmail || ''

    const userByStackId = await prisma.user.findUnique({
      where: { stackId: user.id }
    })

    const userByEmail = await prisma.user.findUnique({
      where: { email: email }
    })

    const allUsersWithEmail = await prisma.user.findMany({
      where: { email: email },
      select: { id: true, stackId: true, email: true, firstName: true, lastName: true, createdAt: true }
    })

    return NextResponse.json({
      currentStackId: user.id,
      currentEmail: email,
      userByStackId,
      userByEmail,
      allUsersWithEmail,
      conflict: userByEmail && userByEmail.stackId !== user.id
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
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { stackId: user.id }
    })

    const totalUsers = await prisma.user.count()

    return NextResponse.json({
      stackUserId: user.id,
      userFoundInDb: !!dbUser,
      userDetails: dbUser,
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