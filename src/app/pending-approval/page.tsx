'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'

export default function PendingApprovalPage() {
  const { user } = useUser()
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }

    // Fetch user status from database
    fetch('/api/user/status')
      .then(res => res.json())
      .then(data => {
        if (data.canAccessDashboard) {
          router.push('/dashboard')
        } else {
          setUserData(data)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Error fetching user data:', err)
        setLoading(false)
      })
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            PRIMA
          </h1>
          <p className="text-sm text-gray-600">
            Palliative Remote Integrated Monitoring
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-0 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 mb-6">
              <svg className="h-7 w-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Menunggu Persetujuan
            </h2>
            
            <div className="text-gray-600 space-y-3 text-sm sm:text-base">
              <p>
                Halo <strong>{userData.firstName} {userData.lastName}</strong>,
              </p>
              <p>
                Akun Anda telah berhasil dibuat namun masih menunggu persetujuan dari administrator.
              </p>
              <p>
                Silakan hubungi administrator untuk memproses persetujuan akun Anda.
              </p>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center justify-center gap-2">
                <span>📧</span> Informasi Kontak
              </h3>
              <p className="text-sm text-blue-700">
                Email: <strong>{userData.email}</strong>
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Role: <span className="px-2 py-1 bg-blue-100 rounded-full text-xs font-medium">
                  {userData.role === 'ADMIN' ? 'Administrator' : 'Member'}
                </span>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-sm text-gray-500">
                  Keluar untuk ganti akun
                </span>
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © 2025 PRIMA - Sistem Monitoring Pasien Kanker Paliatif
          </p>
        </div>
      </div>
    </div>
  )
}