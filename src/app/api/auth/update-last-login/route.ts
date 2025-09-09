import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'
// DB utils temporarily inlined

export async function POST() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find user by Clerk ID
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (existingUser.length === 0) {

      // Check if this is the first user (should be admin)
      const userCountResult = await db
        .select({ count: count(users.id) })
        .from(users)

      const userCount = userCountResult[0]?.count || 0
      const isFirstUser = userCount === 0

      // Create new user
      try {
        await db
          .insert(users)
          .values({
            clerkId: userId,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: isFirstUser ? 'SUPERADMIN' : 'MEMBER',
            isApproved: isFirstUser, // First user auto-approved
            approvedAt: isFirstUser ? new Date() : null
          })

        return NextResponse.json({ success: true, message: 'User synced and login updated' })
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError)

        // Return success even if sync fails to prevent blocking user flow
        return NextResponse.json({
          success: true,
          message: 'Login successful, but user sync failed',
          warning: 'User data may not be fully synchronized'
        })
      }
    }

    // User login tracking removed as lastLoginAt field not needed for this system

    return NextResponse.json({ success: true })
  } catch {
    
    // Return success to not block user authentication flow
    return NextResponse.json({ 
      success: true,
      message: 'Login processed with warnings',
      warning: 'Some background operations failed'
    })
  }
}