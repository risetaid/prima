'use client'

import { useAuthContext } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthLoadingProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireApproval?: boolean
  allowedRoles?: ('SUPERADMIN' | 'ADMIN' | 'MEMBER')[]
}

export function AuthLoading({
  children,
  requireAuth = false,
  requireApproval = false,
  allowedRoles
}: AuthLoadingProps) {
  const { isLoaded, isSignedIn, canAccessDashboard, role } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  // Optimistic access for returning users
  const [optimisticAccess, setOptimisticAccess] = useState(false)

  useEffect(() => {
    // Check if user had successful login recently for optimistic UI
    if (isSignedIn && !canAccessDashboard && !isLoaded) {
      const lastLogin = localStorage.getItem('prima_last_successful_login')
      const recentLogin = lastLogin && (Date.now() - parseInt(lastLogin)) < 24 * 60 * 60 * 1000 // 24 hours

      if (recentLogin) {
        console.log('Using optimistic access for recent user')
        setOptimisticAccess(true)
      }
    }

    // Clear optimistic access when auth state is fully loaded
    if (isLoaded) {
      setOptimisticAccess(false)
    }
  }, [isSignedIn, canAccessDashboard, isLoaded])

  useEffect(() => {
    if (!isLoaded) return // Wait for auth to load

    // Handle authentication requirements
    if (requireAuth && !isSignedIn) {
      router.replace('/sign-in')
      return
    }

    // Handle approval requirements with optimistic access
    if (requireApproval && isSignedIn && !canAccessDashboard && !optimisticAccess) {
      router.replace('/pending-approval')
      return
    }

    // Handle role-based access
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace('/unauthorized')
      return
    }

    // Redirect signed-in users away from auth pages - only if they can access dashboard
    if (isSignedIn && (pathname === '/sign-in' || pathname === '/sign-up')) {
      if (canAccessDashboard || optimisticAccess) {
        router.replace('/dashboard')
      } else {
        router.replace('/pending-approval')
      }
      return
    }

    // If we're on pending-approval but user can access dashboard, redirect
    if (isSignedIn && pathname === '/pending-approval' && (canAccessDashboard || optimisticAccess)) {
      router.replace('/dashboard')
      return
    }

  }, [isLoaded, isSignedIn, canAccessDashboard, role, requireAuth, requireApproval, allowedRoles, router, pathname, optimisticAccess])

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  // Don't render children if redirecting
  if (requireAuth && !isSignedIn) return null
  if (requireApproval && isSignedIn && !canAccessDashboard) return null
  if (allowedRoles && role && !allowedRoles.includes(role)) return null
  if (isSignedIn && (pathname === '/sign-in' || pathname === '/sign-up')) return null

  return <>{children}</>
}