'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckSquare } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

interface CompletedReminder {
  id: string
  scheduledTime: string
  reminderDate: string
  customMessage?: string
  confirmationStatus?: string
  confirmedAt: string
  sentAt?: string
}

export default function CompletedRemindersPage() {
  const router = useRouter()
  const params = useParams()
  const [reminders, setReminders] = useState<CompletedReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchCompletedReminders(params.id as string)
    }
  }, [params.id])

  const fetchCompletedReminders = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/reminders/completed`)
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      } else {
        console.error('Failed to fetch completed reminders')
        setReminders([])
      }
    } catch (error) {
      console.error('Error fetching completed reminders:', error)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }



  const formatShortDateTime = (isoString: string) => {
    if (!isoString || isoString === "null" || isoString === "undefined") {
      return "Tanggal tidak tersedia";
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "Tanggal tidak valid";
    }

    // isoString already converted to WIB in API
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} - ${hours}.${minutes}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white">
        <div className="flex justify-between items-center px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-blue-600" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <CheckSquare className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Selesai</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
               {/* Main Card */}
               <div className="bg-gray-50 p-4">
                 <div className="flex-1">
                   <h3 className="font-semibold text-gray-900 mb-2">
                     {reminder.customMessage || `Minum obat`}
                   </h3>
                   <p className="text-gray-600 text-sm mb-1">
                     Dikirim pada: {formatShortDateTime(reminder.sentAt || reminder.reminderDate)}
                   </p>
                   <p className="text-gray-600 text-sm">
                     Diperbarui pada: {formatShortDateTime(reminder.confirmedAt)}
                   </p>
                 </div>
               </div>

              {/* Status Button */}
              <div className="p-0">
                <div className={`w-full py-3 text-center font-semibold text-white ${
                  reminder.confirmationStatus === 'CONFIRMED'
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}>
                  {reminder.confirmationStatus === 'CONFIRMED' ? 'Dikonfirmasi' : 'Tidak Dikonfirmasi'}
                </div>
              </div>
            </div>
          ))}

          {reminders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada pengingat yang selesai</p>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
