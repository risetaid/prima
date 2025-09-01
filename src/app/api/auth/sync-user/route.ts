import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'

export async function POST() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists in database',
        user: existingUser[0]
      })
    }

    // Check if this is the first user (should be superadmin)
    const userCountResult = await db
      .select({ count: count(users.id) })
      .from(users)
    
    const userCount = userCountResult[0]?.count || 0
    const isFirstUser = userCount === 0
    
    console.log(`🔍 Sync User - Current user count in DB: ${userCount}`)
    console.log(`🔍 Sync User - Is first user? ${isFirstUser}`)
    console.log(`🔍 Sync User - Will set role to: ${isFirstUser ? 'SUPERADMIN' : 'MEMBER'}`)

    // Create user in database
    const newUser = await db
      .insert(users)
      .values({
        clerkId: userId,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: isFirstUser ? 'SUPERADMIN' : 'MEMBER',
        isApproved: isFirstUser, // First user auto-approved
        approvedAt: isFirstUser ? new Date() : null,
      })
      .returning()

    return NextResponse.json({ 
      success: true, 
      message: 'User synced successfully',
      user: newUser[0]
    })
  } catch (error) {
    console.error('Sync user error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}