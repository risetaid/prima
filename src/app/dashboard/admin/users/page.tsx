import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/admin/user-management'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const user = await requireAdmin()
  
  if (!user) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-blue-600">PRIMA Admin</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manajemen Pengguna</h1>
          <p className="text-gray-600">Kelola registrasi dan persetujuan pengguna</p>
        </div>
        
        <UserManagement />
      </main>
    </div>
  )
}