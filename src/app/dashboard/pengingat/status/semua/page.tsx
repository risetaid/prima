'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function SemuaPage() {
  const router = useRouter()

  // Sample data based on mockup 10 - combination of all statuses
  const reminders = [
    {
      id: '1',
      message: 'Minum obat candesartan',
      date: 'Minggu, 17 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
    },
    {
      id: '2',
      message: 'Minum obat candesartan',
      date: 'Senin, 18 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
    },
    {
      id: '3',
      message: 'Minum obat candesartan',
      date: 'Selasa, 19 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
    },
    {
      id: '4',
      message: 'Minum obat candesartan',
      date: 'Rabu, 20 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
    },
    {
      id: '5',
      message: 'Minum obat candesartan',
      date: 'Kamis, 21 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
    },
    {
      id: '6',
      message: 'Minum obat candesartan',
      date: 'Minggu, 3 Agustus 2025',
      time: '12.00',
      status: 'terjadwal'
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
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-xl font-bold text-gray-900">Semua</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-blue-500 text-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{reminder.message}</h3>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{reminder.time}</span>
                </div>
              </div>
              <p className="text-sm opacity-90">{reminder.date}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}