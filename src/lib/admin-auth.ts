import { getCurrentUser } from '@/lib/auth-utils'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Check if current user has admin access
 * This will be used for CMS access control in Phase 11
 */
export async function requireAdminAccess() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  if (user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }
  
  return user
}

/**
 * Check if user has admin access in Clerk Organization
 * This is specifically for CMS access in Phase 11
 */
export async function requireOrganizationAdmin(clerkUserId: string) {
  const organizationId = process.env.CLERK_PRIMA_ORG_ID || 'org_3272q1HCR3BTvJchU1u9oh2uzZs'
  
  try {
    const clerk = await clerkClient()
    const membership = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      userId: [clerkUserId]
    })
    
    if (membership.data.length === 0) {
      throw new Error('User is not a member of PRIMA organization')
    }
    
    const userMembership = membership.data[0]
    if (userMembership.role !== 'org:admin') {
      throw new Error('Organization admin access required')
    }
    
    return userMembership
  } catch (error) {
    console.error('Organization membership check failed:', error)
    throw new Error('Organization admin access required')
  }
}

/**
 * Check if user is admin without throwing error
 * Useful for conditional UI rendering
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user?.role === 'ADMIN'
  } catch {
    return false
  }
}

/**
 * Admin access validation for API routes
 */
export function createAdminMiddleware() {
  return async () => {
    try {
      await requireAdminAccess()
      return null // No error, continue
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Access denied' 
      }), { 
        status: error instanceof Error && error.message === 'Authentication required' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}