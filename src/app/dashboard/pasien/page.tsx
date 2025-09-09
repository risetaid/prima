'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { PatientList } from '@/components/patient/PatientList'

export default function PatientListPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <PatientList />
      </main>
    </div>
  )
}