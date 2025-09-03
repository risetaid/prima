'use client'

import { Header } from "@/components/ui/header"
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
    if (!isLoaded) return

    if (!user) {
      router.push('/sign-in')
      return
    }

    checkAccess()
  }, [user, isLoaded, router])

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/user/profile')
      
      if (!response.ok) {
        console.error('❌ CMS Layout: Failed to fetch user profile:', response.status)
        toast.error('Gagal memverifikasi akses')
        router.push('/dashboard')
        return
      }

      const userData = await response.json()
      setUserRole(userData.role)

      if (userData.role !== 'ADMIN' && userData.role !== 'SUPERADMIN') {
        toast.error('Akses CMS membutuhkan role ADMIN atau SUPERADMIN')
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('❌ CMS Layout: Error checking access:', error)
      toast.error('Terjadi kesalahan saat memverifikasi akses')
      router.push('/dashboard')
    } finally {
      setLoading(false)
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
  )
}