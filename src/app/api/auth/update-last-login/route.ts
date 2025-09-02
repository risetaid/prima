import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'
import { nowWIB } from '@/lib/datetime'
import { safeDbOperation, logDbPerformance } from '@/lib/db-utils'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find user by Clerk ID with safe retry mechanism
    const existingUser = await safeDbOperation(async () => {
      return await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1)
    }, { maxRetries: 2, delayMs: 500 }, 5000) // 5 second timeout

    if (existingUser.length === 0) {
      
      // Check if this is the first user (should be admin) with retry
      const userCountResult = await safeDbOperation(async () => {
        return await db
          .select({ count: count(users.id) })
          .from(users)
      }, { maxRetries: 2, delayMs: 500 }, 5000)
      
      const userCount = userCountResult[0]?.count || 0
      const isFirstUser = userCount === 0

      // Create new user with retry mechanism
      try {
        await safeDbOperation(async () => {
          return await db
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
        }, { maxRetries: 2, delayMs: 500 }, 5000)
        
        logDbPerformance('user-auto-sync', startTime)
        return NextResponse.json({ success: true, message: 'User synced and login updated' })
      } catch (syncError) {
        console.error('Auto-sync failed after retries:', syncError)
        
        // Return success even if sync fails to prevent blocking user flow
        return NextResponse.json({ 
          success: true, 
          message: 'Login successful, but user sync failed',
          warning: 'User data may not be fully synchronized'
        })
      }
    }

    // User login tracking removed as lastLoginAt field not needed for this system
    logDbPerformance('user-login-check', startTime)

    return NextResponse.json({ success: true })
  } catch (error) {
    
    // Return success to not block user authentication flow
    return NextResponse.json({ 
      success: true,
      message: 'Login processed with warnings',
      warning: 'Some background operations failed'
    })
  }
}