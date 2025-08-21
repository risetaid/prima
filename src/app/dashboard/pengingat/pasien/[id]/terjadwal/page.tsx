'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Trash2, X } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { formatDateWIB } from '@/lib/datetime'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'

interface ScheduledReminder {
  id: string
  medicationName: string
  scheduledTime: string
  nextReminderDate: string
  customMessage?: string
}

export default function ScheduledRemindersPage() {
  const router = useRouter()
  const params = useParams()
  const [reminders, setReminders] = useState<ScheduledReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState<string[]>([])
  const { confirm, ConfirmComponent } = useConfirm()

  useEffect(() => {
    if (params.id) {
      fetchScheduledReminders(params.id as string)
    }
  }, [params.id])

  const fetchScheduledReminders = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/reminders/scheduled`)
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      } else {
        console.error('Failed to fetch scheduled reminders')
        setReminders([])
      }
    } catch (error) {
      console.error('Error fetching scheduled reminders:', error)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  const toggleReminderSelection = (reminderId: string) => {
    setSelectedReminders(prev =>
      prev.includes(reminderId)
        ? prev.filter(id => id !== reminderId)
        : [...prev, reminderId]
    )
  }

  const handleDeleteReminders = async () => {
    if (selectedReminders.length === 0) return

    confirm({
      title: 'Hapus Pengingat',
      description: `Apakah Anda yakin ingin menghapus ${selectedReminders.length} pengingat? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/patients/${params.id}/reminders/scheduled`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reminderIds: selectedReminders })
          })

          if (response.ok) {
            // Remove from local state after successful API call
            setReminders(prev => prev.filter(r => !selectedReminders.includes(r.id)))
            setSelectedReminders([])
            setIsDeleteMode(false)
            toast.success('Pengingat berhasil dihapus', {
              description: `${selectedReminders.length} pengingat telah dihapus`
            })
          } else {
            const error = await response.json()
            toast.error('Gagal menghapus pengingat', {
              description: error.error || 'Terjadi kesalahan pada server'
            })
          }
        } catch (error) {
          console.error('Error deleting reminders:', error)
          toast.error('Gagal menghapus pengingat', {
            description: 'Terjadi kesalahan jaringan'
          })
        }
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    
    return `${dayName}, ${day} ${month} ${year}`
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
      <ConfirmComponent />
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
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Terjadwal</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center space-x-3">
              {isDeleteMode && (
                <input
                  type="checkbox"
                  checked={selectedReminders.includes(reminder.id)}
                  onChange={() => toggleReminderSelection(reminder.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-2 border-blue-300"
                />
              )}
              <div className="flex-1 bg-blue-500 text-white rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {reminder.customMessage || `Minum obat ${reminder.medicationName}`}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {formatDate(reminder.nextReminderDate)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 text-white">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">{reminder.scheduledTime}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {reminders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada pengingat terjadwal</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {isDeleteMode ? (
          <div className="flex flex-col space-y-3">
            {/* Delete Selected Button - Show first when items are selected */}
            {selectedReminders.length > 0 && (
              <button
                onClick={handleDeleteReminders}
                className="bg-red-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-pointer flex items-center space-x-2"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-sm font-medium">Hapus ({selectedReminders.length})</span>
              </button>
            )}
            
            {/* Cancel Button */}
            <button
              onClick={() => {
                setIsDeleteMode(false)
                setSelectedReminders([])
              }}
              className="bg-gray-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-gray-600 transition-colors cursor-pointer flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span className="text-sm font-medium">Batal</span>
            </button>
          </div>
        ) : (
          /* Delete Mode Button */
          <button
            onClick={() => setIsDeleteMode(true)}
            disabled={reminders.length === 0}
            className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
            title="Hapus Pengingat"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  )
}