'use client'

import { useAuthContext } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { AuthLoading } from '@/components/auth/auth-loading'

export default function PendingApprovalPage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const [userData, setUserData] = useState<{firstName?: string; lastName?: string; email?: string; role?: string; canAccessDashboard?: boolean} | null>(null)
  const [superadminContact, setSuperadminContact] = useState<{name?: string; email?: string; hospitalName?: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }

    // Fetch user status and superadmin contact info
    Promise.all([
      fetch('/api/user/status').then(res => res.json()),
      fetch('/api/admin/superadmin-contact').then(res => res.json())
    ])
      .then(([userData, superadminData]) => {
        if (userData.canAccessDashboard) {
          router.push('/dashboard')
        } else {
          setUserData(userData)
          setSuperadminContact(superadminData)
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
    <AuthLoading requireAuth={true}>
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
                Untuk mempercepat proses persetujuan, silakan hubungi administrator melalui email di bawah ini.
              </p>
            </div>

            {/* User Info Card */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center justify-center gap-2">
                <span>👤</span> Informasi Akun Anda
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

            {/* Superadmin Contact Card */}
            {superadminContact && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <h3 className="font-medium text-green-800 mb-3 flex items-center justify-center gap-2">
                  <span>📧</span> Hubungi Administrator
                </h3>
                <div className="text-center space-y-2">
                  <p className="text-sm text-green-700">
                    <strong>{superadminContact.name}</strong>
                  </p>
                  <p className="text-sm text-green-600">
                    {superadminContact.hospitalName}
                  </p>
                  <div className="mt-3">
                    <a 
                      href={`mailto:${superadminContact.email}?subject=PRIMA - Permintaan Persetujuan Akun&body=Halo ${superadminContact.name},%0D%0A%0D%0ASaya ${userData.firstName} ${userData.lastName} (${userData.email}) memerlukan persetujuan untuk mengakses sistem PRIMA.%0D%0A%0D%0AMohon bantuannya untuk memproses persetujuan akun saya.%0D%0A%0D%0ATerima kasih,%0D%0A${userData.firstName} ${userData.lastName}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <span>✉️</span>
                      Kirim Email Sekarang
                    </a>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Email: {superadminContact.email}
                  </p>
                </div>
              </div>
            )}

            {/* Manual Contact Instructions */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2 text-center">
                📝 Template Email (Manual)
              </h4>
              <div className="text-xs text-gray-600 bg-white p-3 rounded border text-left">
                <p className="font-medium mb-2">Subject: PRIMA - Permintaan Persetujuan Akun</p>
                <p className="mb-2">Halo {superadminContact?.name || 'Administrator'},</p>
                <p className="mb-2">Saya <strong>{userData.firstName} {userData.lastName}</strong> ({userData.email}) memerlukan persetujuan untuk mengakses sistem PRIMA.</p>
                <p className="mb-2">Mohon bantuannya untuk memproses persetujuan akun saya.</p>
                <p>Terima kasih,<br/>{userData.firstName} {userData.lastName}</p>
              </div>
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
    </AuthLoading>
  )
}