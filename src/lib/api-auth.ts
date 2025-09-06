// Authentication utilities
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

export async function getAuthenticatedUser() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return null
    }

    // Get user from database
    const dbUserResult = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isApproved: users.isApproved,
        isActive: users.isActive,
        approvedBy: users.approvedBy,
        approvedAt: users.approvedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
    
    const dbUser = dbUserResult.length > 0 ? dbUserResult[0] : null
    
    // Get approver details if available
    let approver = null
    if (dbUser?.approvedBy) {
      const approverResult = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, dbUser.approvedBy))
        .limit(1)
      
      approver = approverResult.length > 0 ? approverResult[0] : null
    }
    
    const dbUserWithApprover = dbUser ? { ...dbUser, approver } : null

    return {
      clerkUser: user,
      dbUser: dbUserWithApprover
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export async function requireAuthenticatedUser() {
  const result = await getAuthenticatedUser()
  
  if (!result || !result.dbUser) {
    throw new Error('Authentication required')
  }

  return result
}