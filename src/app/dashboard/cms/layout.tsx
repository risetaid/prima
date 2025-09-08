'use client'

import { Header } from "@/components/ui/header"
import { CMSErrorBoundary } from '@/components/ui/error-boundary'
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) {
      console.log('🔍 CMS Layout: Clerk not loaded yet, waiting...')
      return
    }

    if (!user) {
      console.log('❌ CMS Layout: No user found, redirecting to sign-in')
      router.push('/sign-in')
      return
    }

    console.log('✅ CMS Layout: User found, checking CMS access...')
    // Add a small delay to ensure Clerk auth is fully initialized
    const timer = setTimeout(() => {
      checkAccess()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [user, isLoaded, router])

  const checkAccess = async (retryCount = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 second
    
    try {
      console.log(`🔍 CMS Layout: Checking access (attempt ${retryCount + 1})`)
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        // If it's a 401/403 and we haven't retried much, try again
        if ((response.status === 401 || response.status === 404) && retryCount < MAX_RETRIES) {
          console.log(`⏳ CMS Layout: Retrying access check in ${RETRY_DELAY}ms (status: ${response.status})`)
          setTimeout(() => {
            checkAccess(retryCount + 1)
          }, RETRY_DELAY)
          return
        }
        
        console.error('❌ CMS Layout: Failed to fetch user profile:', response.status)
        
        if (response.status === 403) {
          const errorData = await response.json().catch(() => null)
          if (errorData?.needsApproval) {
            toast.error('Akun Anda belum disetujui admin')
            router.push('/pending-approval')
          } else {
            toast.error('Akses CMS membutuhkan role ADMIN atau SUPERADMIN')
            router.push('/dashboard')
          }
        } else if (response.status === 401) {
          toast.error('Sesi Anda telah berakhir, silakan login kembali')
          router.push('/sign-in')
        } else {
          toast.error('Gagal memverifikasi akses')
          router.push('/dashboard')
        }
        return
      }

      const userData = await response.json()
      console.log('✅ CMS Layout: Access verified for role:', userData.role)
      setUserRole(userData.role)

      if (userData.role !== 'ADMIN' && userData.role !== 'SUPERADMIN') {
        toast.error('Akses CMS membutuhkan role ADMIN atau SUPERADMIN')
        router.push('/dashboard')
        return
      }
      
      // Success - stop loading
      setLoading(false)
    } catch (error) {
      console.error('❌ CMS Layout: Error checking access:', error)
      
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ CMS Layout: Retrying access check due to network error`)
        setTimeout(() => {
          checkAccess(retryCount + 1)
        }, RETRY_DELAY)
        return
      }
      
      toast.error('Terjadi kesalahan saat memverifikasi akses')
      router.push('/dashboard')
    } finally {
      // Set loading to false only if this is the final retry attempt and we failed
      if (retryCount >= MAX_RETRIES && !userRole) {
        setLoading(false)
      }
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat CMS...</p>
        </div>
      </div>
    )
  }

  if (!user || !userRole || (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600 mb-6">
            CMS membutuhkan role ADMIN atau SUPERADMIN
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <CMSErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.png)",
            }}
          />
        </div>

        {/* Header */}
        <Header showNavigation={true} className="relative z-10" />

        {/* Main Content */}
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </CMSErrorBoundary>
  )
}