/**
 * Client-safe authentication utilities
 * These functions are safe to use in client components
 */

import { useUser } from '@clerk/nextjs'
import type { User } from '@/db/schema'

export interface ClientAuthUser extends User {
  canAccessDashboard: boolean
  needsApproval: boolean
}

/**
 * Client-safe version of getCurrentUser for client components
 * Uses Clerk's useUser hook instead of server-side auth
 */
export function useCurrentUser(): ClientAuthUser | null {
  const { user: clerkUser, isLoaded } = useUser()

  if (!isLoaded || !clerkUser) {
    return null
  }

  // For client components, we can't query the database directly
  // We'll need to get user data from Clerk metadata or API calls
  // For now, return a basic user object with Clerk data
  const basicUser: ClientAuthUser = {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    hospitalName: null,
    role: 'MEMBER', // Default role - will be updated via API if needed
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    approvedAt: null,
    approvedBy: null,
    isApproved: false,
    clerkId: clerkUser.id,
    deletedAt: null,
    canAccessDashboard: false,
    needsApproval: true
  }

  return basicUser
}

/**
 * Get user role from Clerk public metadata
 * This is a safer approach for client components
 */
export function useUserRole(): 'SUPERADMIN' | 'ADMIN' | 'MEMBER' | null {
  const { user } = useUser()

  if (!user) {
    return null
  }

  // Try to get role from Clerk public metadata
  const role = user.publicMetadata?.role as string

  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'MEMBER') {
    return role
  }

  return 'MEMBER' // Default role
}