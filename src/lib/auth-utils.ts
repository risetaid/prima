import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { User } from '@prisma/client'

export interface AuthUser extends User {
  canAccessDashboard: boolean
  needsApproval: boolean
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()

    if (!userId || !clerkUser) {
      return null
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!dbUser) {
      return null
    }

    const authUser: AuthUser = {
      ...dbUser,
      canAccessDashboard: dbUser.isApproved && dbUser.isActive,
      needsApproval: !dbUser.isApproved
    }

    return authUser
  } catch (error) {
    console.error('Error getting current user:', error)
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

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireApprovedUser()
  
  if (user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  return user
}

export async function getUserPatients(userId: string) {
  try {
    // Only get patients assigned to this user
    const patients = await prisma.patient.findMany({
      where: {
        assignedVolunteerId: userId,
        deletedAt: null
      },
      include: {
        assignedVolunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        manualConfirmations: true,
        reminderLogs: {
          where: { 
            status: 'DELIVERED',
            reminderSchedule: {
              isActive: true
            }
          },
          include: {
            reminderSchedule: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    // Calculate compliance rates
    return patients.map(patient => {
      const totalDeliveredReminders = patient.reminderLogs.length
      const totalConfirmations = patient.manualConfirmations.length
      
      const complianceRate = totalDeliveredReminders > 0 
        ? Math.round((totalConfirmations / totalDeliveredReminders) * 100)
        : 0

      return {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        address: patient.address,
        birthDate: patient.birthDate,
        diagnosisDate: patient.diagnosisDate,
        cancerStage: patient.cancerStage,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        notes: patient.notes,
        isActive: patient.isActive,
        deletedAt: patient.deletedAt,
        complianceRate,
        assignedVolunteer: patient.assignedVolunteer,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }
    })
  } catch (error) {
    console.error('Error getting user patients:', error)
    return []
  }
}