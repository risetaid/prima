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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Menunggu Persetujuan
          </h2>
          
          <div className="text-gray-600 space-y-4">
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

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">📧 Informasi Kontak</h3>
            <p className="text-sm text-blue-700">
              Email: <strong>{userData.email}</strong>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Role: <span className="px-2 py-1 bg-blue-100 rounded-full text-xs">
                {userData.role === 'ADMIN' ? 'Administrator' : 'Member'}
              </span>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-500">
                atau keluar untuk ganti akun
              </span>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}