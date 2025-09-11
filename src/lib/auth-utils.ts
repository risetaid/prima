import { db, users, patients } from '@/db'
import { redirect } from 'next/navigation'
import { eq, and, isNull, desc, asc, count } from 'drizzle-orm'
import type { User } from '@/db/schema'
import { logger } from '@/lib/logger'

// Server-side only imports - conditionally imported to avoid client-side issues
let auth: (() => Promise<{ userId: string | null }>) | null = null
let currentUser: (() => Promise<{
  id: string
  firstName: string | null
  lastName: string | null
  primaryEmailAddress?: { emailAddress: string } | null
} | null>) | null = null

// Only import server-side Clerk functions when not in browser
if (typeof window === 'undefined') {
  const { auth: clerkAuth, currentUser: clerkCurrentUser } = await import('@clerk/nextjs/server')
  auth = clerkAuth
  currentUser = clerkCurrentUser
}

export interface AuthUser extends User {
  canAccessDashboard: boolean
  needsApproval: boolean
}

export interface AdminUser extends AuthUser {
  id: string
  role: 'ADMIN' | 'SUPERADMIN'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (!auth) {
      logger.error('Clerk auth function not available', new Error('Auth function not initialized'), {
        auth: true,
        clerk: true
      })
      return null
    }

    const { userId } = await auth()

    if (!userId) {
      return null
    }

    if (!currentUser) {
      logger.error('Clerk currentUser function not available', new Error('CurrentUser function not initialized'), {
        auth: true,
        clerk: true
      })
      return null
    }

    const user = await currentUser()
    if (!user) {
      return null
    }

    // Get user from database using Clerk ID with optimized retry logic
    let dbUserResult
    let retries = 2  // Reduced from 3 to 2
    
    while (retries > 0) {
      try {
        dbUserResult = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1)
        break
      } catch (dbError: unknown) {
        retries--
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error'
        logger.warn('Database query failed during user authentication', {
          auth: true,
          database: true,
          userId,
          retriesLeft: retries,
          attempt: 3 - retries,
          error: errorMessage
        })
        
        // Only retry on connection issues with shorter delay
        if (retries > 0 && (errorMessage.includes('connection') || errorMessage.includes('timeout'))) {
          await new Promise(resolve => setTimeout(resolve, 300)) // Reduced from 1000ms to 300ms
          continue
        }
        
        // Don't retry on other types of errors
        throw dbError
      }
    }

    const dbUser = dbUserResult?.[0]

    if (!dbUser) {
      logger.info('No database user found for Clerk ID, attempting to sync', {
        auth: true,
        clerk: true,
        userId,
        sync: true
      })

      // Try to sync the user automatically
      try {
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
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: isFirstUser ? 'SUPERADMIN' : 'MEMBER',
            isApproved: isFirstUser, // First user auto-approved
            approvedAt: isFirstUser ? new Date() : null,
          })
          .returning()

        const newDbUser = newUserResult[0]
        logger.info('User synced successfully', {
          auth: true,
          clerk: true,
          userId,
          role: newDbUser.role,
          sync: true
        })

        const authUser: AuthUser = {
          ...newDbUser,
          canAccessDashboard: newDbUser.isApproved && newDbUser.isActive,
          needsApproval: !newDbUser.isApproved
        }

        return authUser
      } catch (syncError) {
        logger.error('Failed to sync user', syncError instanceof Error ? syncError : new Error(String(syncError)), {
          auth: true,
          clerk: true,
          userId,
          sync: true
        })
        return null
      }
    }

    const authUser: AuthUser = {
      ...dbUser,
      canAccessDashboard: dbUser.isApproved && dbUser.isActive,
      needsApproval: !dbUser.isApproved
    }

    return authUser
  } catch (error) {
    logger.error('Error getting current user', error instanceof Error ? error : new Error(String(error)), {
      auth: true,
      clerk: true
    })
    return null
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  return user
}

// Safe version for API routes that returns null instead of throwing redirect
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser()
    return user
  } catch (error) {
    logger.warn('Failed to get authenticated user for API route', {
      auth: true,
      api: true,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

export async function requireApprovedUser(): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (!user.canAccessDashboard) {
    redirect('/pending-approval')
  }

  return user
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireApprovedUser()
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    redirect('/unauthorized')
  }

  return user as AdminUser
}

export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireApprovedUser()
  
  if (user.role !== 'SUPERADMIN') {
    redirect('/unauthorized')
  }

  return user
}

export async function getUserPatients(userId: string) {
  try {
    // Only get patients assigned to this user - simplified version for now
    const patientsResult = await db
      .select()
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(
        and(
          eq(patients.assignedVolunteerId, userId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(patients.isActive), asc(patients.name))

    // For now, return simplified patient data (we can optimize this later with proper joins)
    return patientsResult.map(row => ({
      id: row.patients.id,
      name: row.patients.name,
      phoneNumber: row.patients.phoneNumber,
      address: row.patients.address,
      birthDate: row.patients.birthDate,
      diagnosisDate: row.patients.diagnosisDate,
      cancerStage: row.patients.cancerStage,
      emergencyContactName: row.patients.emergencyContactName,
      emergencyContactPhone: row.patients.emergencyContactPhone,
      notes: row.patients.notes,
      isActive: row.patients.isActive,
      deletedAt: row.patients.deletedAt,
      complianceRate: 0, // TODO: Calculate properly with separate queries
      assignedVolunteer: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        email: row.users.email
      } : null,
      createdAt: row.patients.createdAt,
      updatedAt: row.patients.updatedAt
    }))
  } catch (error) {
    logger.error('Error getting user patients', error instanceof Error ? error : new Error(String(error)), {
      auth: true,
      patients: true
    })
    return []
  }
}