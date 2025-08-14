'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TerjadwalPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  if (!isLoaded) return <div>Loading...</div>
  if (!user) redirect('/sign-in')

  const handleTambahPengingat = () => {
    router.push('/pengingat/tambah')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="text-blue-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          <div className="bg-blue-500 rounded-full p-2">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Tambah Pengingat Baru Button */}
        <button 
          onClick={handleTambahPengingat}
          className="w-full bg-blue-500 text-white rounded-full py-3 px-6 mb-6 flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Pengingat Baru</span>
        </button>

        {/* Empty State - No scheduled reminders */}
        <div className="flex-1 flex items-center justify-center min-h-96">
          <div className="text-center text-gray-500">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-lg mb-2">Belum ada pengingat terjadwal</p>
            <p className="text-sm">Tambah pengingat baru untuk pasien ini</p>
          </div>
        </div>
      </main>
    </div>
  )
}