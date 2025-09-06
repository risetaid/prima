import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'
import { nowWIB } from '@/lib/datetime'
import { safeDbOperation, logDbPerformance } from '@/lib/db-utils'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

/**
 * Consolidated User Session API
 * Combines: /api/user/profile + /api/user/status + /api/auth/update-last-login
 * 
 * This single endpoint:
 * 1. Handles user authentication and sync from Clerk
 * 2. Updates last login timestamp (background)
 * 3. Returns complete user session data
 * 
 * Reduces 3 sequential API calls to 1 consolidated call (70% reduction)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    if (!userId || !clerkUser) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        success: false,
        needsLogin: true
      }, { status: 401 })
    }

    // Try to get from cache first for massive performance boost
    const cacheKey = CACHE_KEYS.userSession(userId)
    const cachedSession = await getCachedData<any>(cacheKey)
    
    if (cachedSession) {
      console.log('⚡ User session cache hit - instant response')
      // Still update login timestamp in background (non-blocking)
      setImmediate(() => {
        safeDbOperation(async () => {
          await db
            .update(users)
            .set({ 
              lastLoginAt: nowWIB(),
              updatedAt: nowWIB()
            })
            .where(eq(users.clerkId, userId))
        }, { maxRetries: 1, delayMs: 300 }, 1000)
        .catch(error => console.warn('⚠️ Background login update failed:', error))
      })
      
      return NextResponse.json(cachedSession)
    }

    console.log('💾 User session cache miss - fetching from database')

    // Try to get existing user first with reduced timeout
    let user = await safeDbOperation(async () => {
      return await getCurrentUser()
    }, { maxRetries: 1, delayMs: 300 }, 2000)
    
    // If user not found in database, create/sync from Clerk
    if (!user) {
      try {
        // Check if this is the first user (should be SUPERADMIN) - optimized query
        const userCountResult = await safeDbOperation(async () => {
          return await db
            .select({ count: count(users.id) })
            .from(users)
            .limit(1) // Only need to know if any exist
        }, { maxRetries: 1, delayMs: 300 }, 2000)
        
        const userCount = userCountResult[0]?.count || 0
        const isFirstUser = userCount === 0
        
        // Create user in database with reduced retry mechanism
        await safeDbOperation(async () => {
          return await db
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
        }, { maxRetries: 1, delayMs: 300 }, 2000)
        
        // Get user again after creation with reduced timeout
        user = await safeDbOperation(async () => {
          return await getCurrentUser()
        }, { maxRetries: 1, delayMs: 300 }, 2000)
      } catch (syncError) {
        console.error('❌ User Session: Failed to sync user from Clerk:', syncError)
        return NextResponse.json({
          error: 'Failed to sync user account',
          success: false,
          needsSupport: true
        }, { status: 500 })
      }
    }
    
    // Handle case where user still not found after sync attempt
    if (!user) {
      return NextResponse.json({
        error: 'User account not found',
        success: false,
        needsSupport: true
      }, { status: 404 })
    }

    // Background login timestamp update (non-blocking) - optimized with shorter timeouts
    // This replaces the separate /api/auth/update-last-login call for performance
    setImmediate(() => {
      safeDbOperation(async () => {
        await db
          .update(users)
          .set({ 
            lastLoginAt: nowWIB(),
            updatedAt: nowWIB()
          })
          .where(eq(users.clerkId, userId))
      }, { maxRetries: 1, delayMs: 500 }, 1500) // Reduced from 3000ms to 1500ms
      .catch(error => {
        console.warn('⚠️ Background login update failed:', error)
        // Don't throw - this is non-critical for user session
      })
    })

    // Return complete session data combining all three endpoints
    const sessionData = {
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved,
        isActive: user.isActive,
        canAccessDashboard: user.canAccessDashboard,
        needsApproval: user.needsApproval,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      session: {
        authenticated: true,
        loginTime: new Date().toISOString(),
        accessLevel: user.role,
        dashboardAccess: user.canAccessDashboard
      }
    }

    // Handle unapproved users
    if (!user.canAccessDashboard) {
      const unapprovedResponse = {
        ...sessionData,
        success: false,
        error: 'Account pending approval',
        needsApproval: true,
        redirectTo: '/pending-approval'
      }
      // Cache unapproved response too (shorter TTL)
      setCachedData(cacheKey, unapprovedResponse, 60) // 1 minute for unapproved
      return NextResponse.json(unapprovedResponse, { status: 403 })
    }

    // Cache successful session data for future requests
    setCachedData(cacheKey, sessionData, CACHE_TTL.USER_SESSION)
      .catch(error => console.warn('⚠️ Failed to cache session data:', error))

    logDbPerformance('consolidated-user-session', startTime)
    
    return NextResponse.json(sessionData)

  } catch (error) {
    console.error('❌ User Session: Unexpected error:', error)
    
    return NextResponse.json({
      error: 'Session initialization failed',
      success: false,
      needsRetry: true
    }, { status: 500 })
  }
}

// GET method for session check (non-modifying)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        needsLogin: true
      }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        canAccessDashboard: user.canAccessDashboard
      }
    })
    
  } catch (error) {
    console.error('❌ Session Check: Error:', error)
    return NextResponse.json({
      authenticated: false,
      error: 'Session check failed'
    }, { status: 500 })
  }
}