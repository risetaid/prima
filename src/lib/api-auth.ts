import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth-utils'
import { unauthorizedError, forbiddenError } from './api-error'
import type { AuthUser } from './auth-utils'

export interface ApiUser extends AuthUser {
  hasRole: (...roles: string[]) => boolean
}

export async function getApiUser(requiredRoles?: string[]): Promise<ApiUser | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  const apiUser: ApiUser = {
    ...user,
    hasRole: (...roles: string[]) => roles.some(role => user.role === role)
  }

  if (requiredRoles && !apiUser.hasRole(...requiredRoles)) {
    return null
  }

  return apiUser
}

export async function requireApiUser(requiredRoles?: string[]) {
  const user = await getApiUser(requiredRoles)
  
  if (!user) {
    if (requiredRoles && requiredRoles.length > 0) {
      return forbiddenError(`Role required: ${requiredRoles.join(', ')}`)
    }
    return unauthorizedError()
  }

  return user
}

// Higher-order function for API routes
export function withApiAuth(requiredRoles?: string[]) {
  return async (request: NextRequest, params: { params: Promise<{ id: string }> }, handler: (user: ApiUser, request: NextRequest, params: { params: Promise<{ id: string }> }) => Promise<NextResponse>) => {
    const user = await getApiUser(requiredRoles)
    
    if (!user) {
      if (requiredRoles && requiredRoles.length > 0) {
        return forbiddenError(`Role required: ${requiredRoles.join(', ')}`)
      }
      return unauthorizedError()
    }

    return handler(user, request, params)
  }
}

// Role-specific wrappers
export async function requireAdminUser() {
  return requireApiUser(['ADMIN', 'SUPERADMIN'])
}

export async function requireSuperAdmin() {
  return requireApiUser(['SUPERADMIN'])
}

export async function requireMemberUser() {
  return requireApiUser(['MEMBER', 'ADMIN', 'SUPERADMIN'])
}