import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users, patients, manualConfirmations, reminderLogs, reminderSchedules } from '@/db'
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

    // Get user from database using Clerk ID with retry logic
    let dbUserResult
    let retries = 3
    
    while (retries > 0) {
      try {
        dbUserResult = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1)
        break
      } catch (dbError: any) {
        retries--
        console.log(`🔄 Auth: Database query failed, retries left: ${retries}`, dbError.message)
        
        // Retry on various database errors
        if ((dbError.code === 'CONNECT_TIMEOUT' || 
             dbError.code === 'CONNECTION_REFUSED' || 
             dbError.message?.includes('connection') ||
             dbError.message?.includes('timeout')) && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
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