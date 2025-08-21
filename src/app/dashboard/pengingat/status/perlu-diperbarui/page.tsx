'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function PerluDiperbaruiPage() {
  const router = useRouter()
  const [reminders, setReminders] = useState([
    {
      id: '1',
      message: 'Minum obat candesartan',
      date: 'Minggu, 3 Agustus 2025',
      time: '12.00'
    },
    {
      id: '2',
      message: 'Minum obat candesartan',
      date: 'Senin, 4 Agustus 2025',
      time: '12.00'
    },
    {
      id: '3',
      message: 'Minum obat candesartan',
      date: 'Selasa, 5 Agustus 2025',
      time: '12.00'
    }
  ])

  const handleAction = (reminderId: string, action: 'ya' | 'tidak') => {
    // Remove the reminder from the list after action
    setReminders(prev => prev.filter(r => r.id !== reminderId))
    
    // Show confirmation
    if (action === 'ya') {
      alert('Pengingat telah diperbarui')
    } else {
      alert('Pengingat ditandai sebagai tidak dipatuhi')
    }
  }

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
          <div className="text-4xl mb-2">⬇️</div>
          <h2 className="text-xl font-bold text-gray-900">Perlu Diperbarui</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada pengingat yang perlu diperbarui</p>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Reminder Info */}
                <div className="bg-blue-500 text-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{reminder.message}</h3>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{reminder.time}</span>
                    </div>
                  </div>
                  <p className="text-sm opacity-90">{reminder.date}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex">
                  <button
                    onClick={() => handleAction(reminder.id, 'ya')}
                    className="flex-1 bg-blue-500 text-white py-4 font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => handleAction(reminder.id, 'tidak')}
                    className="flex-1 bg-red-500 text-white py-4 font-semibold hover:bg-red-600 transition-colors"
                  >
                    Tidak
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}