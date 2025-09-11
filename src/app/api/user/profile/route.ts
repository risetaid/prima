import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { count } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Profile API: Getting current user...')
    
    let user = await getCurrentUser()
    
    // If user not found in database, try to sync from Clerk
    if (!user) {
      console.log('🔍 Profile API: User not found in DB, trying to sync from Clerk...')
      
      const { userId } = await auth()
      const clerkUser = await currentUser()
      
      if (!userId || !clerkUser) {
        console.log('❌ Profile API: No Clerk authentication found')
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        )
      }

      console.log(`🔍 Profile API: Creating new user for Clerk ID: ${userId}`)
      
      try {
        // Check if this is the first user (should be superadmin)
        const userCountResult = await db
          .select({ count: count(users.id) })
          .from(users)
        
        const userCount = userCountResult[0]?.count || 0
        const isFirstUser = userCount === 0
        
        console.log(`🔍 Profile API: User count: ${userCount}, isFirstUser: ${isFirstUser}`)
        
        // Create user in database
        await db
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
        
        console.log('✅ Profile API: User created successfully')
        
        // Give a small delay to ensure the user is properly created
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get user again after creation with retry logic
        let retries = 3
        while (retries > 0 && !user) {
          user = await getCurrentUser()
          if (!user && retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          retries--
        }
        
        if (!user) {
          console.error('❌ Profile API: Failed to retrieve user after creation')
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          )
        }
      } catch (dbError: unknown) {
        // If user already exists (race condition), try to get them again
        const error = dbError as { code?: string; message?: string }
        if (error.code === '23505' || error.message?.includes('unique constraint')) {
          console.log('🔄 Profile API: User already exists, fetching...')
          user = await getCurrentUser()
        } else {
          throw dbError
        }
      }
    }
    
    // Handle unauthenticated users properly
    if (!user) {
      console.log('❌ Profile API: User still not found after all attempts')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log(`✅ Profile API: User found - Role: ${user.role}, Approved: ${user.isApproved}`)

    // Handle unapproved users
    if (!user.canAccessDashboard) {
      console.log('⚠️ Profile API: User not approved for dashboard access')
      return NextResponse.json(
        { error: 'Not approved', needsApproval: true },
        { status: 403 }
      )
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('❌ Profile API: Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

