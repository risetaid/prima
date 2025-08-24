import { UserMenu } from '@/components/ui/user-menu'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-4 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-red-100 mb-4 sm:mb-6">
            <svg className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Akses Ditolak
          </h2>
          
          <div className="text-gray-600 space-y-3 sm:space-y-4 text-sm sm:text-base">
            <p>
              Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
            <p>
              Halaman yang Anda coba akses memerlukan hak akses administrator.
            </p>
          </div>

          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            <Link 
              href="/dashboard"
              className="block w-full bg-blue-600 text-white py-2.5 sm:py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
            >
              Kembali ke Dashboard
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 pt-3 sm:pt-4 border-t border-gray-200">
              <UserMenu />
              <span className="text-xs sm:text-sm text-gray-500 text-center">
                atau keluar untuk ganti akun
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}