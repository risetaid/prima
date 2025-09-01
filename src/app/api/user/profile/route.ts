import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    let user = await getCurrentUser()
    
    // If user not found in database, try to sync from Clerk
    if (!user) {
      const { userId } = await auth()
      const clerkUser = await currentUser()
      
      if (userId && clerkUser) {
        // Check if this is the first user (should be superadmin)
        const userCountResult = await db
          .select({ count: count(users.id) })
          .from(users)
        
        const userCount = userCountResult[0]?.count || 0
        const isFirstUser = userCount === 0
        
        // Create user in database
        const newUserResult = await db
          .insert(users)
          .values({
            clerkId: userId,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            role: isFirstUser ? 'SUPERADMIN' : 'MEMBER',
            isApproved: isFirstUser,
            approvedAt: isFirstUser ? new Date() : null,
          })
          .returning()
        
        // Get user again after creation
        user = await getCurrentUser()
      }
    }
    
    // Handle unauthenticated users properly
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Handle unapproved users
    if (!user.canAccessDashboard) {
      return NextResponse.json(
        { error: 'Not approved', needsApproval: true },
        { status: 403 }
      )
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}