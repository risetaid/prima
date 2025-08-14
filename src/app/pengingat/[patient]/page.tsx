'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, Download, CheckSquare, MessageSquare } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

export default function PatientPengingatPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const params = useParams()
  
  if (!isLoaded) return <div>Loading...</div>
  if (!user) redirect('/sign-in')

  const handleTambahPengingat = () => {
    router.push('/pengingat/tambah')
  }

  const handleTerjadwal = () => {
    router.push('/pengingat/terjadwal')
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

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Terjadwal */}
          <button 
            onClick={handleTerjadwal}
            className="bg-white rounded-lg p-6 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              5
            </div>
            <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium text-center">Terjadwal</p>
          </button>

          {/* Perlu Diperbarui */}
          <div className="bg-white rounded-lg p-6 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow">
            <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <Download className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium text-center">Perlu Diperbarui</p>
          </div>

          {/* Selesai */}
          <div className="bg-white rounded-lg p-6 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow">
            <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              10
            </div>
            <CheckSquare className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium text-center">Selesai</p>
          </div>

          {/* Semua */}
          <div className="bg-white rounded-lg p-6 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow">
            <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              18
            </div>
            <MessageSquare className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium text-center">Semua</p>
          </div>
        </div>

        {/* Statistik Kepatuhan */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Statistik Kepatuhan</h2>
          
          {/* Chart Container */}
          <div className="bg-blue-500 rounded-lg p-6 h-48 flex items-end justify-center space-x-2">
            {/* Simple bar chart representation */}
            <div className="bg-white w-6 h-16 rounded-t"></div>
            <div className="bg-white w-6 h-24 rounded-t"></div>
            <div className="bg-white w-6 h-20 rounded-t"></div>
            <div className="bg-white w-6 h-12 rounded-t"></div>
            <div className="bg-white w-6 h-28 rounded-t"></div>
            <div className="bg-white w-6 h-18 rounded-t"></div>
          </div>
        </div>
      </main>
    </div>
  )
}