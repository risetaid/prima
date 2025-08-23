import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Akses Ditolak
          </h2>
          
          <div className="text-gray-600 space-y-4">
            <p>
              Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
            <p>
              Halaman yang Anda coba akses memerlukan hak akses administrator.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Link 
              href="/dashboard"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Kembali ke Dashboard
            </Link>
            
            <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-200">
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