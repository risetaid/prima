import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default async function PendingApprovalPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  if (user.canAccessDashboard) {
    redirect('/dashboard')
  }

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
              Halo <strong>{user.firstName} {user.lastName}</strong>,
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
              Email: <strong>{user.email}</strong>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Role: <span className="px-2 py-1 bg-blue-100 rounded-full text-xs">
                {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
              </span>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm text-gray-500">
                atau keluar untuk ganti akun
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}