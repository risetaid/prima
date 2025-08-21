'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Clock, User, Pill } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

interface Reminder {
  id: string
  messageTemplate: string
  timeOfDay: string
  status: 'terjadwal' | 'perlu-diperbarui' | 'selesai'
  patient: {
    id: string
    name: string
  }
  medication: {
    name: string
  }
  latestLog?: {
    scheduledFor: string
    status: string
  }
}

export default function ReminderStatusPage() {
  const router = useRouter()
  const params = useParams()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  
  const status = params.status as string

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'terjadwal': return 'Terjadwal'
      case 'perlu-diperbarui': return 'Perlu Diperbarui'
      case 'selesai': return 'Selesai'
      case 'semua': return 'Semua'
      default: return 'Pengingat'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'terjadwal': return '📅'
      case 'perlu-diperbarui': return '⬇️'
      case 'selesai': return '✅'
      case 'semua': return '💬'
      default: return '📋'
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [status])

  const fetchReminders = async () => {
    try {
      const response = await fetch(`/api/reminders?status=${status}`)
      if (response.ok) {
        const data = await response.json()
        setReminders(data.filter((r: Reminder) => {
          if (status === 'semua') return true
          return r.status === status
        }))
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReminderAction = async (reminderId: string, action: 'ya' | 'tidak') => {
    // For demo purposes, just redirect to appropriate status page
    const targetStatus = action === 'ya' ? 'selesai' : 'selesai'
    router.push(`/dashboard/pengingat/status/${targetStatus}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // Remove seconds if present
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
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
        {/* Status Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{getStatusIcon(status)}</div>
          <h2 className="text-xl font-bold text-gray-900">{getStatusTitle(status)}</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada pengingat dengan status ini</p>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Reminder Info */}
                <div className="bg-blue-500 text-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{reminder.messageTemplate}</h3>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{formatTime(reminder.timeOfDay)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{reminder.patient.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Pill className="w-4 h-4" />
                      <span>{reminder.medication.name}</span>
                    </div>
                  </div>
                  {reminder.latestLog && (
                    <p className="text-sm mt-2 opacity-90">
                      {formatDate(reminder.latestLog.scheduledFor)}
                    </p>
                  )}
                </div>

                {/* Action Buttons for "Perlu Diperbarui" status */}
                {reminder.status === 'perlu-diperbarui' && (
                  <div className="flex">
                    <button
                      onClick={() => handleReminderAction(reminder.id, 'ya')}
                      className="flex-1 bg-blue-500 text-white py-3 font-medium hover:bg-blue-600 transition-colors"
                    >
                      Ya
                    </button>
                    <button
                      onClick={() => handleReminderAction(reminder.id, 'tidak')}
                      className="flex-1 bg-red-500 text-white py-3 font-medium hover:bg-red-600 transition-colors"
                    >
                      Tidak
                    </button>
                  </div>
                )}

                {/* Status Indicator for "Selesai" */}
                {reminder.status === 'selesai' && (
                  <div className="p-3">
                    {reminder.latestLog?.status === 'DELIVERED' ? (
                      <div className="bg-green-500 text-white py-2 px-4 rounded-lg text-center font-medium">
                        Dipatuhi
                      </div>
                    ) : (
                      <div className="bg-red-500 text-white py-2 px-4 rounded-lg text-center font-medium">
                        Tidak Dipatuhi
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}