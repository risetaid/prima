'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, Calendar, Download, CheckSquare, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Reminder {
  id: string
  medicationName: string
  scheduledTime: string
  reminderDate: string
  customMessage?: string
  status: string
  medicationTaken?: boolean
  sentAt?: string
  confirmedAt?: string
}

interface ReminderStats {
  terjadwal: number
  perluDiperbarui: number
  selesai: number
}

interface PatientReminderDesktopProps {
  patientName: string
}

export function PatientReminderDesktop({ patientName }: PatientReminderDesktopProps) {
  const router = useRouter()
  const params = useParams()
  const [terjadwalReminders, setTerjadwalReminders] = useState<Reminder[]>([])
  const [perluDiperbaruiReminders, setPerluDiperbaruiReminders] = useState<Reminder[]>([])
  const [selesaiReminders, setSelesaiReminders] = useState<Reminder[]>([])
  const [stats, setStats] = useState<ReminderStats>({ terjadwal: 0, perluDiperbarui: 0, selesai: 0 })
  const [loading, setLoading] = useState(true)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState<string[]>([])

  useEffect(() => {
    if (params.id) {
      fetchAllReminders()
      // Stats are now calculated from actual data, no separate API call needed
    }
  }, [params.id])

  const fetchAllReminders = async () => {
    try {
      // Use the same API endpoint as mobile - /all gives us everything in correct format
      const response = await fetch(`/api/patients/${params.id}/reminders/all`)
      
      if (response.ok) {
        const allData = await response.json()
        console.log('🔍 All Reminders API Response:', allData)
        
        // Filter and categorize based on status from API
        const terjadwal = allData.filter((item: any) => item.status === 'scheduled')
        const perlu = allData.filter((item: any) => item.status === 'pending')  
        const selesai = allData.filter((item: any) => 
          item.status === 'completed_taken' || item.status === 'completed_not_taken'
        )

        // Map to expected format with proper medicationTaken for completed items
        const mappedTerjadwal = terjadwal.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || 'Obat tidak diketahui',
          scheduledTime: item.scheduledTime || '--:--',
          reminderDate: item.reminderDate || new Date().toISOString().split('T')[0],
          customMessage: item.customMessage || '',
          status: 'scheduled'
        }))

        const mappedPerlu = perlu.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || 'Obat tidak diketahui',
          scheduledTime: item.scheduledTime || '--:--',
          reminderDate: item.reminderDate || new Date().toISOString().split('T')[0],
          customMessage: item.customMessage || '',
          status: 'pending'
        }))

        const mappedSelesai = selesai.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || 'Obat tidak diketahui',
          scheduledTime: item.scheduledTime || '--:--',
          reminderDate: item.reminderDate || new Date().toISOString().split('T')[0],
          customMessage: item.customMessage || '',
          status: 'completed',
          medicationTaken: item.status === 'completed_taken',
          confirmedAt: item.confirmedAt
        }))

        console.log('🔍 Categorized - Terjadwal:', mappedTerjadwal.length, 'Perlu:', mappedPerlu.length, 'Selesai:', mappedSelesai.length)
        
        setTerjadwalReminders(mappedTerjadwal)
        setPerluDiperbaruiReminders(mappedPerlu)
        setSelesaiReminders(mappedSelesai)

        // Update stats based on actual data
        setStats({
          terjadwal: mappedTerjadwal.length,
          perluDiperbarui: mappedPerlu.length,
          selesai: mappedSelesai.length
        })
      } else {
        console.error('❌ All Reminders API failed:', response.status)
        toast.error('Gagal memuat data pengingat')
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast.error('Gagal memuat data pengingat')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/reminders/stats`)
      if (response.ok) {
        const statsData = await response.json()
        setStats({
          terjadwal: Number(statsData.terjadwal) || 0,
          perluDiperbarui: Number(statsData.perluDiperbarui) || 0,
          selesai: Number(statsData.selesai) || 0
        })
      } else {
        // Fallback to calculated stats from actual data
        const calcStats = {
          terjadwal: Array.isArray(terjadwalReminders) ? terjadwalReminders.length : 0,
          perluDiperbarui: Array.isArray(perluDiperbaruiReminders) ? perluDiperbaruiReminders.length : 0,
          selesai: Array.isArray(selesaiReminders) ? selesaiReminders.length : 0
        }
        console.log('📊 Calculated fallback stats:', calcStats)
        setStats(calcStats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Fallback to calculated stats from actual data
      const calcStats = {
        terjadwal: Array.isArray(terjadwalReminders) ? terjadwalReminders.length : 0,
        perluDiperbarui: Array.isArray(perluDiperbaruiReminders) ? perluDiperbaruiReminders.length : 0,
        selesai: Array.isArray(selesaiReminders) ? selesaiReminders.length : 0
      }
      console.log('📊 Error fallback stats:', calcStats)
      setStats(calcStats)
    }
  }

  const handleAddReminder = () => {
    router.push(`/dashboard/pengingat/pasien/${params.id}/tambah`)
  }

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode)
    setSelectedReminders([])
  }

  const toggleReminderSelection = (reminderId: string) => {
    setSelectedReminders(prev => 
      prev.includes(reminderId)
        ? prev.filter(id => id !== reminderId)
        : [...prev, reminderId]
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedReminders.length === 0) {
      toast.warning('Pilih pengingat yang akan dihapus')
      return
    }

    try {
      const deletePromises = selectedReminders.map(reminderId =>
        fetch(`/api/reminders/scheduled/${reminderId}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      toast.success(`${selectedReminders.length} pengingat berhasil dihapus`)
      
      // Refresh data (stats are calculated automatically)
      await fetchAllReminders()
      
      // Reset delete mode
      setDeleteMode(false)
      setSelectedReminders([])
    } catch (error) {
      console.error('Error deleting reminders:', error)
      toast.error('Gagal menghapus pengingat')
    }
  }

  const handlePendingAction = async (reminderId: string, action: 'ya' | 'tidak') => {
    try {
      const response = await fetch(`/api/patients/${params.id}/reminders/manual-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderLogId: reminderId,
          medicationsTaken: action === 'ya',
          visitDate: new Date().toISOString().split('T')[0],
          visitTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          patientCondition: 'STABLE',
          symptomsReported: [],
          notes: `Konfirmasi ${action === 'ya' ? 'Ya' : 'Tidak'} via dashboard desktop`
        })
      })

      if (response.ok) {
        toast.success(`Konfirmasi "${action === 'ya' ? 'Ya' : 'Tidak'}" berhasil disimpan`)
        await fetchAllReminders()
      } else {
        throw new Error('Failed to save confirmation')
      }
    } catch (error) {
      console.error('Error saving confirmation:', error)
      toast.error('Gagal menyimpan konfirmasi')
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString || timeString === 'null' || timeString === 'undefined') {
      return '--:--'
    }
    return timeString
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'Tanggal tidak tersedia'
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid'
    }
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const renderReminderCard = (reminder: Reminder, showCheckbox = false, showActions = false) => (
    <div key={reminder.id} className="bg-blue-600 text-white rounded-lg p-4 relative">
      {showCheckbox && (
        <div className="absolute top-3 left-3">
          <input
            type="checkbox"
            checked={selectedReminders.includes(reminder.id)}
            onChange={() => toggleReminderSelection(reminder.id)}
            className="w-4 h-4 rounded border-white/30"
          />
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className={showCheckbox ? 'ml-6' : ''}>
          <h3 className="font-semibold text-lg">{reminder.customMessage || reminder.medicationName || 'Pesan pengingat'}</h3>
          <p className="text-sm opacity-90">{formatDate(reminder.reminderDate)}</p>
        </div>
        <div className="flex items-center text-white/90">
          <Clock className="w-4 h-4 mr-1" />
          <span className="font-semibold">{formatTime(reminder.scheduledTime)}</span>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handlePendingAction(reminder.id, 'ya')}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            Ya
          </button>
          <button
            onClick={() => handlePendingAction(reminder.id, 'tidak')}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            Tidak
          </button>
        </div>
      )}
    </div>
  )

  const renderSelesaiCard = (reminder: Reminder) => (
    <div key={reminder.id} className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{reminder.customMessage || reminder.medicationName || 'Pesan pengingat'}</h3>
          <p className="text-sm text-gray-600">{formatDate(reminder.reminderDate)}</p>
          {reminder.confirmedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Dikonfirmasi: {formatDate(reminder.confirmedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span className="font-semibold">{formatTime(reminder.scheduledTime)}</span>
        </div>
      </div>

      <div className="mt-3">
        {reminder.medicationTaken === true ? (
          <div className="bg-green-500 text-white py-2 px-4 rounded text-center font-medium">
            Dipatuhi
          </div>
        ) : reminder.medicationTaken === false ? (
          <div className="bg-red-500 text-white py-2 px-4 rounded text-center font-medium">
            Tidak Dipatuhi
          </div>
        ) : (
          <div className="bg-gray-500 text-white py-2 px-4 rounded text-center font-medium">
            Status tidak diketahui
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pengingat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Pengingat untuk {patientName}
          </h1>
          
          <button
            onClick={handleAddReminder}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Pengingat Baru</span>
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Column 1: Terjadwal */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {deleteMode && (
                <button
                  onClick={toggleDeleteMode}
                  className="p-1 hover:bg-white/20 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <Calendar className="w-5 h-5" />
              <h2 className="font-semibold">Terjadwal</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
                {isNaN(stats.terjadwal) ? 0 : stats.terjadwal}
              </span>
              {!deleteMode && (
                <button
                  onClick={toggleDeleteMode}
                  className="p-1 hover:bg-white/20 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {terjadwalReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tidak ada pengingat terjadwal</p>
            ) : (
              terjadwalReminders.map(reminder => renderReminderCard(reminder, deleteMode))
            )}
          </div>

          {deleteMode && selectedReminders.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <button
                onClick={handleDeleteSelected}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors font-medium cursor-pointer"
              >
                Hapus {selectedReminders?.length || 0} Pengingat
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Perlu Diperbarui */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <h2 className="font-semibold">Perlu Diperbarui</h2>
            </div>
            <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
              {isNaN(stats.perluDiperbarui) ? 0 : stats.perluDiperbarui}
            </span>
          </div>
          
          <div className="p-4 space-y-3">
            {perluDiperbaruiReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tidak ada pengingat yang perlu diperbarui</p>
            ) : (
              perluDiperbaruiReminders.map(reminder => renderReminderCard(reminder, false, true))
            )}
          </div>
        </div>

        {/* Column 3: Selesai */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5" />
              <h2 className="font-semibold">Selesai</h2>
            </div>
            <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
              {isNaN(stats.selesai) ? 0 : stats.selesai}
            </span>
          </div>
          
          <div className="p-4 space-y-3">
            {selesaiReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tidak ada pengingat selesai</p>
            ) : (
              selesaiReminders.map(reminder => renderSelesaiCard(reminder))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}