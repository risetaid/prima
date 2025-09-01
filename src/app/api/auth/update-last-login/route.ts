import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'
import { nowWIB } from '@/lib/datetime'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find user by Clerk ID, if not found create user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (existingUser.length === 0) {
      console.log(`User with Clerk ID ${userId} not found in database. Auto-syncing user...`)
      
      // Check if this is the first user (should be admin)
      const userCountResult = await db
        .select({ count: count(users.id) })
        .from(users)
      
      const userCount = userCountResult[0]?.count || 0
      const isFirstUser = userCount === 0

      // Create new user for Stack Auth
      try {        
        await db
          .insert(users)
          .values({
            clerkId: userId,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: isFirstUser ? 'ADMIN' : 'MEMBER',
            isApproved: isFirstUser, // First user auto-approved
            approvedAt: isFirstUser ? new Date() : null
          })
        
        console.log(`✅ User auto-synced: ${user.primaryEmailAddress?.emailAddress}`)
        return NextResponse.json({ success: true, message: 'User synced and login updated' })
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError)
        return NextResponse.json({ 
          success: false, 
          message: 'User not synced and auto-sync failed',
          error: syncError instanceof Error ? syncError.message : 'Unknown error'
        }, { status: 404 })
      }
    }

    // User login tracking removed as lastLoginAt field not needed for this system
    console.log(`✅ User logged in: ${existingUser[0].email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating last login:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}