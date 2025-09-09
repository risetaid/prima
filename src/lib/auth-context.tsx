'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import type { UserResource } from '@clerk/types'

interface AuthContextState {
  user: UserResource | null
  isLoaded: boolean
  isSignedIn: boolean
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER' | null
  canAccessDashboard: boolean
  needsApproval: boolean
}

const AuthContext = createContext<AuthContextState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [role, setRole] = useState<'SUPERADMIN' | 'ADMIN' | 'MEMBER' | null>(null)
  const [canAccessDashboard, setCanAccessDashboard] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(true)

  const isLoaded = userLoaded && authLoaded

  useEffect(() => {
    if (!isLoaded || !user) {
      setRole(null)
      setCanAccessDashboard(false)
      setNeedsApproval(true)
      return
    }

    // Get role from Clerk public metadata
    const userRole = user.publicMetadata?.role as string
    const approved = user.publicMetadata?.approved as boolean

    if (userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'MEMBER') {
      setRole(userRole)
    } else {
      setRole('MEMBER') // Default role
    }

    setCanAccessDashboard(approved === true)
    setNeedsApproval(approved !== true)
  }, [user, isLoaded])

  const value: AuthContextState = {
    user: user ?? null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    role,
    canAccessDashboard,
    needsApproval
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}