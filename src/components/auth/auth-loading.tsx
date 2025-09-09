'use client'

import { useAuthContext } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

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

  useEffect(() => {
    if (!isLoaded) return // Wait for auth to load

    // Handle authentication requirements
    if (requireAuth && !isSignedIn) {
      router.replace('/sign-in')
      return
    }

    // Handle approval requirements
    if (requireApproval && isSignedIn && !canAccessDashboard) {
      router.replace('/pending-approval')
      return
    }

    // Handle role-based access
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace('/unauthorized')
      return
    }

    // Redirect signed-in users away from auth pages
    if (isSignedIn && (pathname === '/sign-in' || pathname === '/sign-up')) {
      router.replace('/dashboard')
      return
    }

  }, [isLoaded, isSignedIn, canAccessDashboard, role, requireAuth, requireApproval, allowedRoles, router, pathname])

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