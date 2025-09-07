import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users, patients } from '@/db'
import { redirect } from 'next/navigation'
import { eq, and, isNull, desc, asc } from 'drizzle-orm'
import type { User } from '@/db/schema'

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
    const { userId } = await auth()
    
    if (!userId) {
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
        console.log(`🔄 Auth: Database query failed, retries left: ${retries}`, {
          error: errorMessage,
          userId,
          attempt: 3 - retries
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
      console.log(`🔍 Auth: No database user found for Clerk ID: ${userId}`)
      return null
    }

    const authUser: AuthUser = {
      ...dbUser,
      canAccessDashboard: dbUser.isApproved && dbUser.isActive,
      needsApproval: !dbUser.isApproved
    }

    return authUser
  } catch (error) {
    console.error('🔍 Auth: Error getting current user:', error)
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
    console.warn('🔍 Auth: Failed to get authenticated user for API route:', error)
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
    console.error('Error getting user patients:', error)
    return []
  }
}