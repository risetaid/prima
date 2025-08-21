'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function SelesaiPage() {
  const router = useRouter()

  // Sample data based on mockup 9
  const reminders = [
    {
      id: '1',
      message: 'Minum obat candesartan',
      date: 'Minggu, 20 Juli 2025',
      time: '12.00',
      status: 'dipatuhi'
    },
    {
      id: '2',
      message: 'Minum obat candesartan',
      date: 'Senin, 21 Juli 2025',
      time: '12.00',
      status: 'tidak_dipatuhi'
    },
    {
      id: '3',
      message: 'Minum obat candesartan',
      date: 'Selasa, 22 Juli 2025',
      time: '12.00',
      status: 'dipatuhi'
    },
    {
      id: '4',
      message: 'Minum obat candesartan',
      date: 'Rabu, 23 Juli 2025',
      time: '12.00',
      status: 'dipatuhi'
    },
    {
      id: '5',
      message: 'Minum obat candesartan',
      date: 'Kamis, 24 Juli 2025',
      time: '12.00',
      status: 'tidak_dipatuhi'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Header with Icon */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Selesai</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Reminder Info */}
              <div className="bg-white p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">{reminder.message}</h3>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">{reminder.time}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{reminder.date}</p>
              </div>

              {/* Status Button */}
              <div className="p-3">
                {reminder.status === 'dipatuhi' ? (
                  <div className="bg-green-500 text-white py-3 px-4 rounded-lg text-center font-semibold">
                    Dipatuhi
                  </div>
                ) : (
                  <div className="bg-red-500 text-white py-3 px-4 rounded-lg text-center font-semibold">
                    Tidak Dipatuhi
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}