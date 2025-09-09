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
  const [dbUserLoaded, setDbUserLoaded] = useState(false)

  const isLoaded = userLoaded && authLoaded && dbUserLoaded

  useEffect(() => {
    if (!userLoaded || !authLoaded || !user) {
      setRole(null)
      setCanAccessDashboard(false)
      setNeedsApproval(true)
      setDbUserLoaded(false)
      return
    }

    // Fetch user status from database to ensure consistency
    fetch('/api/user/status')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Error fetching user status:', data.error)
          setRole('MEMBER')
          setCanAccessDashboard(false)
          setNeedsApproval(true)
        } else {
          setRole(data.role || 'MEMBER')
          setCanAccessDashboard(data.canAccessDashboard || false)
          setNeedsApproval(data.needsApproval !== false)
        }
      })
      .catch(error => {
        console.error('Error fetching user status:', error)
        setRole('MEMBER')
        setCanAccessDashboard(false)
        setNeedsApproval(true)
      })
      .finally(() => {
        setDbUserLoaded(true)
      })
  }, [user, userLoaded, authLoaded])

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