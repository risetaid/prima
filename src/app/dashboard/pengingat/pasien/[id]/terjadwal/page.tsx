'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Trash2, X, Edit } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { formatDateWIB } from '@/lib/datetime'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { toast } from '@/components/ui/toast'
import { ReminderListSkeleton } from '@/components/ui/dashboard-skeleton'
import { ContentSelector } from '@/components/reminder/ContentSelector'

interface ContentItem {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  tags: string[]
  publishedAt: Date | null
  createdAt: Date
  type: 'article' | 'video'
  thumbnailUrl?: string
  url: string
  excerpt?: string
  videoUrl?: string
  durationMinutes?: string
  order?: number
}

interface ScheduledReminder {
  id: string
  medicationName: string
  scheduledTime: string
  nextReminderDate: string
  customMessage?: string
  attachedContent?: ContentItem[]
}

export default function ScheduledRemindersPage() {
  const router = useRouter()
  const params = useParams()
  const [reminders, setReminders] = useState<ScheduledReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState<string[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<ScheduledReminder | null>(null)
  const [editTime, setEditTime] = useState('')

  const [editMessage, setEditMessage] = useState('')
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

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

    setConfirmModal({
      isOpen: true,
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

  const openEditModal = (reminder: ScheduledReminder) => {
    if (isDeleteMode) return // Don't open modal in delete mode
    setSelectedReminder(reminder)
    setEditTime(reminder.scheduledTime)
    setEditMessage(reminder.customMessage || `Minum obat ${reminder.medicationName}`)
    setSelectedContent(reminder.attachedContent || [])
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedReminder(null)
    setEditTime('')
    setEditMessage('')
    setSelectedContent([])
    setIsUpdating(false)
  }

  const handleEditReminder = async () => {
    if (!editTime) {
      toast.error('Waktu pengingat tidak boleh kosong')
      return
    }
    if (!editMessage.trim()) {
      toast.error('Pesan pengingat tidak boleh kosong')
      return
    }

    if (!selectedReminder) return

    setIsUpdating(true)
    try {
      // Update existing reminder with new time and message only
      const response = await fetch(`/api/reminders/scheduled/${selectedReminder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderTime: editTime,
          customMessage: editMessage,
          attachedContent: selectedContent.map(content => ({
            id: content.id,
            title: content.title,
            type: content.type.toUpperCase() as 'ARTICLE' | 'VIDEO',
            slug: content.slug
          }))
        }),
      })

      if (response.ok) {
        toast.success('Pengingat berhasil diperbarui')
        // Refresh the reminders
        if (params.id) {
          fetchScheduledReminders(params.id as string)
        }
        closeEditModal()
      } else {
        const error = await response.json()
        toast.error('Gagal memperbarui pengingat', {
          description: error.error || 'Terjadi kesalahan pada server'
        })
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error('Gagal memperbarui pengingat', {
        description: 'Terjadi kesalahan jaringan'
      })
    } finally {
      setIsUpdating(false)
    }
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
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Pengingat Terjadwal</h1>
            <UserButton />
          </div>
        </header>

        {/* Main Content with Skeleton */}
        <main className="px-4 py-6">
          <ReminderListSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
      />
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
              <div 
                className={`flex-1 bg-blue-500 text-white rounded-2xl p-4 transition-all duration-200 ${
                  isDeleteMode ? '' : 'cursor-pointer hover:bg-blue-600 active:bg-blue-700 hover:shadow-lg'
                }`}
                onClick={() => openEditModal(reminder)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {reminder.customMessage || `Minum obat ${reminder.medicationName}`}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {formatDate(reminder.nextReminderDate)}
                    </p>
                    {!isDeleteMode && (
                      <p className="text-blue-200 text-xs mt-2 flex items-center space-x-1">
                        <Edit className="w-3 h-3" />
                        <span>Tap untuk edit waktu</span>
                      </p>
                    )}
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
      
      {/* Edit Modal */}
      {isEditModalOpen && selectedReminder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Edit Waktu Pengingat</h3>
              <button
                onClick={closeEditModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                disabled={isUpdating}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Pengingat Saat Ini:</h4>
                <p className="font-medium text-gray-900">
                  {selectedReminder.customMessage || `Minum obat ${selectedReminder.medicationName}`}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedReminder.nextReminderDate)} - {selectedReminder.scheduledTime}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pesan Pengingat
                  </label>
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={isUpdating}
                    placeholder="Contoh: Jangan lupa minum obat candesartan pada waktu yang tepat"
                  />
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waktu Pengingat
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isUpdating}
                  />
                </div>

                {/* Content Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lampirkan Konten (Opsional)
                  </label>
                  <ContentSelector
                    selectedContent={selectedContent}
                    onContentChange={setSelectedContent}
                    maxSelection={5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex space-x-3 p-4 border-t flex-shrink-0">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isUpdating}
              >
                Batal
              </button>
              <button
                onClick={handleEditReminder}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUpdating || !editTime || !editMessage.trim()}
              >
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}