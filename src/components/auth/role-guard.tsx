'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthContext } from '@/lib/auth-context'

interface RoleGuardProps {
  allowedRoles: ('MEMBER' | 'ADMIN' | 'SUPERADMIN')[]
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export function RoleGuard({ 
  allowedRoles, 
  children, 
  redirectTo = '/dashboard',
  fallback = null 
}: RoleGuardProps) {
  const { role: userRole, isLoaded } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && userRole && !allowedRoles.includes(userRole as 'MEMBER' | 'ADMIN' | 'SUPERADMIN')) {
      // Show appropriate error message
      if (allowedRoles.includes('ADMIN') || allowedRoles.includes('SUPERADMIN')) {
        toast.error('Akses Ditolak', {
          description: 'Anda tidak memiliki akses ke halaman ini. Butuh role ADMIN atau SUPERADMIN.'
        })
      } else {
        toast.error('Akses Ditolak', {
          description: 'Anda tidak memiliki akses ke halaman ini.'
        })
      }
      
      // Redirect after showing error
      setTimeout(() => {
        router.push(redirectTo)
      }, 1000)
    }
  }, [userRole, isLoaded, allowedRoles, router, redirectTo])

  // Show loading state
  if (!isLoaded) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa akses...</p>
        </div>
      </div>
    )
  }

  // Block access if user doesn't have required role
  if (userRole && !allowedRoles.includes(userRole as 'MEMBER' | 'ADMIN' | 'SUPERADMIN')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600 mb-4">
            Anda tidak memiliki akses ke halaman ini. 
            {allowedRoles.includes('SUPERADMIN') && ' Butuh role SUPERADMIN.'}
            {allowedRoles.includes('ADMIN') && !allowedRoles.includes('SUPERADMIN') && ' Butuh role ADMIN.'}
          </p>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Render children if user has required role
  return <>{children}</>
}

