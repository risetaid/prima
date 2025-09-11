'use client'

import { UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()
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
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-6">
              <svg className="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Akses Ditolak
            </h2>
            
            <div className="text-gray-600 space-y-3 text-sm sm:text-base">
              <p>
                Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
              <p>
                Halaman yang Anda coba akses memerlukan hak akses administrator.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={() => router.back()}
                className="block w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium cursor-pointer"
              >
                Kembali ke Halaman Sebelumnya
              </button>
              
              <button 
                onClick={() => router.push('/dashboard')}
                className="block w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium cursor-pointer"
              >
                Ke Dashboard Utama
              </button>
              
              <div className="flex items-center justify-center space-x-3 pt-4 border-t border-gray-200">
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

