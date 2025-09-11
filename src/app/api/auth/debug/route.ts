import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'

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
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.primaryEmailAddress?.emailAddress || ''

    const userByClerkIdResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
    
    const userByClerkId = userByClerkIdResult.length > 0 ? userByClerkIdResult[0] : null

    const userByEmailResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    const userByEmail = userByEmailResult.length > 0 ? userByEmailResult[0] : null

    const allUsersWithEmail = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.email, email))

    return NextResponse.json({
      currentClerkId: userId,
      currentEmail: email,
      userByClerkId,
      userByEmail,
      allUsersWithEmail,
      conflict: userByEmail && userByEmail.clerkId !== userId
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
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUserResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
    
    const dbUser = dbUserResult.length > 0 ? dbUserResult[0] : null

    const totalUsersResult = await db
      .select({ count: count(users.id) })
      .from(users)
    
    const totalUsers = totalUsersResult[0]?.count || 0

    return NextResponse.json({
      clerkUserId: userId,
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

