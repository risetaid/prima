'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default function VideoPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Video Edukasi</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎥</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Video Edukasi</h2>
          <p className="text-gray-600">Fitur akan segera hadir</p>
        </div>
      </main>
    </div>
  )
}