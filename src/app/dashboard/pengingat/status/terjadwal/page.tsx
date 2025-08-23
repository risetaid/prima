'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Edit, Trash2 } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { formatDateWIB, formatTimeWIB } from '@/lib/datetime'
import { toast } from 'sonner'

interface ScheduledReminder {
  id: string
  patientName: string
  medicationName: string
  scheduledTime: string
  createdAt: string
  patient: {
    id: string
    name: string
    phoneNumber: string
  }
  isActive: boolean
}

export default function TerjadwalPage() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ScheduledReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [editingReminder, setEditingReminder] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('')

  useEffect(() => {
    fetchScheduledReminders()
  }, [])

  const fetchScheduledReminders = async () => {
    try {
      const response = await fetch('/api/reminders/scheduled')
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      }
    } catch (error) {
      console.error('Error fetching scheduled reminders:', error)
      toast.error('Gagal memuat pengingat terjadwal')
    } finally {
      setLoading(false)
    }
  }

  const handleEditReminder = async (reminderId: string) => {
    if (!editTime) {
      toast.error('Waktu pengingat tidak boleh kosong')
      return
    }

    try {
      const response = await fetch(`/api/reminders/scheduled/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderTime: editTime
        }),
      })

      if (response.ok) {
        toast.success('Waktu pengingat berhasil diperbarui')
        setEditingReminder(null)
        setEditTime('')
        fetchScheduledReminders()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal memperbarui pengingat')
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error('Gagal memperbarui pengingat')
    }
  }

  const handleDeleteReminder = async (reminderId: string) => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus pengingat ini?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/reminders/scheduled/${reminderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Pengingat berhasil dihapus')
        fetchScheduledReminders()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal menghapus pengingat')
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast.error('Gagal menghapus pengingat')
    }
  }

  const startEdit = (reminder: ScheduledReminder) => {
    setEditingReminder(reminder.id)
    setEditTime(reminder.scheduledTime)
  }

  const cancelEdit = () => {
    setEditingReminder(null)
    setEditTime('')
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
          <div className="text-4xl mb-2">📅</div>
          <h2 className="text-xl font-bold text-gray-900">Terjadwal</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Belum ada pengingat terjadwal</p>
              <button
                onClick={() => router.push('/dashboard/pengingat/tambah')}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Tambah Pengingat
              </button>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{reminder.patient.name}</h3>
                    <p className="text-sm text-gray-600">{reminder.medicationName}</p>
                  </div>
                  
                  {editingReminder === reminder.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleEditReminder(reminder.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{reminder.scheduledTime}</span>
                      </div>
                      <button
                        onClick={() => startEdit(reminder)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>Dibuat: {formatDateWIB(new Date(reminder.createdAt))}</p>
                  <p>Status: {reminder.isActive ? 'Aktif' : 'Nonaktif'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}