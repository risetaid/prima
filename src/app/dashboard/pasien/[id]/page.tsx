'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, User, ChevronRight, Camera, Upload, X, Plus, ChevronLeft, Calendar, MessageSquare, Clock, Repeat, ChevronDown, Zap } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Header } from '@/components/ui/header'
import { formatDateWIB, formatDateTimeWIB } from '@/lib/datetime'
import Image from 'next/image'
import { toast } from 'sonner'
import { getCurrentTimeWIB } from '@/lib/datetime'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'
import { PatientVariablesManager } from '@/components/patient/patient-variables-manager'
import { PatientDetailSkeleton } from '@/components/ui/dashboard-skeleton'
import VerificationBadge, { getVerificationStatusTitle, getVerificationStatusDescription } from '@/components/patient/verification-badge'
import VerificationActionsPanel from '@/components/patient/verification-actions-panel'
import VerificationInfoPanel from '@/components/patient/verification-info-panel'
import VerificationHistory from '@/components/patient/verification-history'
import VerificationStatusIcon from '@/components/patient/verification-status-icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AddReminderModal } from '@/components/pengingat/add-reminder-modal'

interface Patient {
  id: string
  name: string
  phoneNumber: string
  address?: string
  birthDate?: string
  diagnosisDate?: string
  cancerStage?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  photoUrl?: string
  complianceRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Verification fields
  verificationStatus: string
  verificationSentAt?: string
  verificationResponseAt?: string
  verificationMessage?: string
  verificationAttempts?: string
  verificationExpiresAt?: string
}

interface HealthNote {
  id: string
  date: string
  note: string
  createdAt: string
}

interface WhatsAppTemplate {
  id: string
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

interface AutoFillData {
  nama: string
  nomor: string
  obat?: string
  dosis?: string
  dokter?: string
  rumahSakit?: string
  volunteer: string
  waktu?: string
  tanggal?: string
  dataContext?: {
    hasActiveMedications: boolean
    hasRecentReminders: boolean
    hasMedicalRecords: boolean
    assignedVolunteerName?: string
    currentUserName?: string
  }
}

export default function PatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState({ name: '', phoneNumber: '', photoUrl: '' })
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([])
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<HealthNote | null>(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [editSelectedDate, setEditSelectedDate] = useState('')
  const [editCurrentMonth, setEditCurrentMonth] = useState(new Date())
  const [showEditCalendar, setShowEditCalendar] = useState(false)
  
  // Simple Reminder Modal State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string)
      fetchHealthNotes(params.id as string)
    }
  }, [params.id])

  const fetchPatient = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPatient(data)
        setEditData({ name: data.name, phoneNumber: data.phoneNumber, photoUrl: data.photoUrl || '' })
        setError(null)
      } else {
        setError('Gagal memuat data pasien')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data pasien')
    } finally {
      setLoading(false)
    }
  }

  const fetchHealthNotes = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/health-notes`)
      if (response.ok) {
        const data = await response.json()
        // Convert API response to match frontend interface
        const formattedNotes: HealthNote[] = data.healthNotes.map((note: any) => ({
          id: note.id,
          date: note.noteDate.split('T')[0], // Extract date part
          note: note.note,
          createdAt: note.createdAt
        }))
        setHealthNotes(formattedNotes)
      } else if (response.status === 404) {
        // Patient not found or no health notes - set empty array silently
        setHealthNotes([])
      } else {
        // Only show error for non-404 errors
        console.error('Health notes fetch error:', response.status, response.statusText)
        toast.error('Gagal memuat catatan kesehatan')
      }
    } catch (error) {
      console.error('Health notes fetch error:', error)
      toast.error('Gagal memuat catatan kesehatan')
    }
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error('Catatan tidak boleh kosong')
      return
    }

    try {
      const response = await fetch(`/api/patients/${params.id}/health-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNoteText.trim(),
          noteDate: selectedDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Add new note to the beginning of the list
        const formattedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split('T')[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt
        }
        
        setHealthNotes(prev => [formattedNote, ...prev])
        setNewNoteText('')
        setSelectedDate(new Date().toISOString().split('T')[0])
        setIsAddNoteModalOpen(false)
        toast.success('Catatan berhasil ditambahkan')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal menambahkan catatan')
      }
    } catch (error) {
      console.error('Error adding health note:', error)
      toast.error('Gagal menambahkan catatan')
    }
  }

  const handleEditNote = (note: HealthNote) => {
    setEditingNote(note)
    setEditNoteText(note.note)
    setEditSelectedDate(note.date)
    setEditCurrentMonth(new Date(note.date))
    setShowEditCalendar(false)
    setIsEditNoteModalOpen(true)
  }

  const handleSaveEditNote = async () => {
    if (!editNoteText.trim()) {
      toast.error('Catatan tidak boleh kosong')
      return
    }

    if (!editingNote) return

    try {
      const response = await fetch(`/api/patients/${params.id}/health-notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: editNoteText.trim(),
          noteDate: editSelectedDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update the note in the list
        const updatedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split('T')[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt
        }

        setHealthNotes(prev => prev.map(note => 
          note.id === editingNote.id ? updatedNote : note
        ))
        
        setIsEditNoteModalOpen(false)
        setEditingNote(null)
        setEditNoteText('')
        setEditSelectedDate('')
        setShowEditCalendar(false)
        toast.success('Catatan berhasil diperbarui')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal memperbarui catatan')
      }
    } catch (error) {
      toast.error('Gagal memperbarui catatan')
    }
  }

  const handleDeleteSelectedNotes = async () => {
    if (selectedNotes.length === 0) {
      toast.error('Pilih catatan yang akan dihapus')
      return
    }

    try {
      const response = await fetch(`/api/patients/${params.id}/health-notes/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteIds: selectedNotes
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Remove deleted notes from the list
        setHealthNotes(prev => prev.filter(note => !selectedNotes.includes(note.id)))
        setSelectedNotes([])
        setIsDeleteMode(false)
        toast.success(data.message || `${selectedNotes.length} catatan berhasil dihapus`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal menghapus catatan')
      }
    } catch (error) {
      toast.error('Gagal menghapus catatan')
    }
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    )
  }

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const dateString = new Date(year, month, day).toISOString().split('T')[0]
    setSelectedDate(dateString)
    setShowCalendar(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  // Edit modal calendar functions
  const getEditCalendarDays = () => {
    const year = editCurrentMonth.getFullYear()
    const month = editCurrentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const handleEditDateClick = (day: number) => {
    const year = editCurrentMonth.getFullYear()
    const month = editCurrentMonth.getMonth()
    const dateString = new Date(year, month, day).toISOString().split('T')[0]
    setEditSelectedDate(dateString)
    setShowEditCalendar(false)
  }

  const navigateEditMonth = (direction: 'prev' | 'next') => {
    setEditCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500",
      "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-lime-500",
      "bg-orange-500", "bg-rose-500", "bg-violet-500", "bg-sky-500"
    ];
    // Use name hash to ensure consistent color per person
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  const handleEdit = () => {
    if (isEditMode) {
      handleSave()
    } else {
      setIsEditMode(true)
    }
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setSelectedPhoto(null)
    setPhotoPreview(null)
    if (patient) {
      setEditData({ name: patient.name, phoneNumber: patient.phoneNumber, photoUrl: patient.photoUrl || '' })
    }
  }

  const handleSave = async () => {
    if (!patient) return

    try {
      let photoUrl = patient.photoUrl

      // Upload photo if a new one is selected
      if (selectedPhoto) {
        const formData = new FormData()
        formData.append('photo', selectedPhoto)
        formData.append('patientId', patient.id)

        const photoResponse = await fetch('/api/upload/patient-photo', {
          method: 'POST',
          body: formData
        })

        if (photoResponse.ok) {
          const photoData = await photoResponse.json()
          photoUrl = photoData.url
        } else {
          console.error('Photo upload failed:', photoResponse.status)
          toast.error('Gagal Upload Foto', {
            description: 'Foto tidak dapat diupload. Data lain akan tetap disimpan.'
          })
        }
      }

      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editData.name,
          phoneNumber: editData.phoneNumber,
          photoUrl: selectedPhoto ? photoUrl : (editData.photoUrl === '' ? null : editData.photoUrl)
        })
      })

      if (response.ok) {
        const updatedPatient = await response.json()
        setPatient(updatedPatient)
        setIsEditMode(false)
        setSelectedPhoto(null)
        setPhotoPreview(null)
        toast.success('Berhasil Disimpan', {
          description: 'Data pasien telah diperbarui.'
        })
      } else {
        toast.error('Gagal Menyimpan', {
          description: 'Tidak dapat menyimpan perubahan data pasien. Coba lagi.'
        })
      }
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      })
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    setEditData({ ...editData, photoUrl: '' })
  }

  const handleSymptomsClick = () => {
    router.push(`/dashboard/pasien/${params.id}/gejala`)
  }

  const handleToggleStatus = async () => {
    if (!patient) return
    
    const action = patient.isActive ? 'nonaktifkan' : 'aktifkan'
    const actionTitle = patient.isActive ? 'Nonaktifkan' : 'Aktifkan'
    
    // Show confirmation toast
    const confirmed = await new Promise<boolean>((resolve) => {
      toast.warning(`${actionTitle} ${patient.name}?`, {
        description: `Pasien akan di${action} dan ${patient.isActive ? 'tidak muncul di daftar' : 'muncul kembali di daftar'}.`,
        action: {
          label: actionTitle,
          onClick: () => resolve(true)
        },
        cancel: {
          label: 'Batal',
          onClick: () => resolve(false)
        },
        duration: 10000
      })
    })
    
    if (!confirmed) return

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...patient,
          isActive: !patient.isActive
        })
      })

      if (response.ok) {
        const updatedPatient = await response.json()
        setPatient(updatedPatient)
        toast.success(`Pasien ${action}`, {
          description: `${patient.name} berhasil di${action}.`
        })
      } else {
        const error = await response.json()
        toast.error(`Gagal ${actionTitle}`, {
          description: `Error: ${error.error || 'Terjadi kesalahan pada server'}`
        })
      }
    } catch (error) {
      console.error('Error toggling patient status:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat mengubah status pasien. Periksa koneksi internet Anda.'
      })
    }
  }

  // Simplified Reminder Functions
  const handleAddReminder = () => {
    setIsReminderModalOpen(true)
  }

  const handleViewReminders = () => {
    router.push(`/dashboard/pengingat/pasien/${params.id}`)
  }

  const handleReminderSuccess = () => {
    toast.success('Pengingat berhasil dibuat!')
    // Could add any additional refresh logic here if needed
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.png)",
            }}
          />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block relative z-10">
          <Header showNavigation={true} />
        </div>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pasien...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showNavigation={true} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">Terjadi kesalahan memuat data pasien</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Coba Lagi
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Return loading if patient data is still null but not in error state
  if (!patient && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showNavigation={true} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pasien...</p>
          </div>
        </main>
      </div>
    )
  }

  // Main return for successful patient data load - patient is guaranteed to be non-null here
  if (!patient) return null; // This should never happen but satisfies TypeScript
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Responsive Header */}
      <Header showNavigation={true} />

      {/* Mobile Title */}
      <div className="lg:hidden flex items-center space-x-2 mb-6 px-4">
        <User className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Informasi Pasien</h2>
      </div>

      {/* Main Content */}
      <main className="px-4 lg:px-8 py-6 max-w-7xl mx-auto relative z-10">
        {/* Desktop Layout - Side by Side */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 mb-6 lg:mb-0">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Profile Header */}
              <div className="bg-blue-500 text-white p-6">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <h3 className="text-xl font-bold">Profil</h3>
                </div>
              </div>

              {/* Profile Content */}
              <div className="p-6">
                {/* Profile Picture */}
                <div className="flex justify-center mb-8 relative">
                  {(photoPreview || patient.photoUrl) ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 relative">
                      <Image
                        src={photoPreview || patient.photoUrl!}
                        alt={patient.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                      {isEditMode && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-32 h-32 ${getRandomAvatarColor(patient.name)} rounded-full flex items-center justify-center relative`}>
                      <span className="text-white font-bold text-3xl">
                        {getInitials(patient.name)}
                      </span>
                      {isEditMode && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isEditMode && (
                    <>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <div className="absolute -bottom-2 flex space-x-2">
                        <button
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors cursor-pointer"
                          title="Upload Foto"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        {(photoPreview || patient.photoUrl) && (
                          <button
                            onClick={handleRemovePhoto}
                            className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors cursor-pointer"
                            title="Hapus Foto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Patient Information */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Nama</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => isEditMode && setEditData({ ...editData, name: e.target.value })}
                      readOnly={!isEditMode}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${
                        isEditMode 
                          ? 'border-blue-200 focus:border-blue-500 focus:outline-none bg-white' 
                          : 'border-transparent bg-gray-50'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Nomor</label>
                    <input
                      type="text"
                      value={editData.phoneNumber}
                      onChange={(e) => isEditMode && setEditData({ ...editData, phoneNumber: e.target.value })}
                      readOnly={!isEditMode}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${
                        isEditMode 
                          ? 'border-blue-200 focus:border-blue-500 focus:outline-none bg-white' 
                          : 'border-transparent bg-gray-50'
                      }`}
                    />
                  </div>
                </div>

                {/* Verification Management Section - Optimized UI */}
                {patient && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    {/* Header with Status */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <VerificationStatusIcon status={patient.verificationStatus} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Status Verifikasi WhatsApp
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getVerificationStatusDescription(patient.verificationStatus, patient.isActive)}
                          </p>
                        </div>
                      </div>
                      <VerificationBadge 
                        status={patient.verificationStatus as 'pending_verification' | 'verified' | 'declined' | 'expired' | 'unsubscribed'} 
                        size="large"
                        patient={patient}
                      />
                    </div>

                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* Status Card */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
                        <div className="font-semibold text-gray-900">
                          {getVerificationStatusTitle(patient.verificationStatus, patient.isActive)}
                        </div>
                      </div>
                      
                      {/* Last Sent Card */}
                      {patient.verificationSentAt && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Terkirim</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatDateTimeWIB(new Date(patient.verificationSentAt))}
                          </div>
                        </div>
                      )}
                      
                      {/* Response Card */}
                      {patient.verificationResponseAt && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Direspon</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatDateTimeWIB(new Date(patient.verificationResponseAt))}
                          </div>
                        </div>
                      )}
                      
                      {/* Attempts Card */}
                      {patient.verificationAttempts && parseInt(patient.verificationAttempts) > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Percobaan</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {patient.verificationAttempts}x
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions Panel - Simplified */}
                    <VerificationActionsPanel 
                      patient={patient}
                      onUpdate={() => fetchPatient(params.id as string)}
                    />
                    
                    {/* Verification History */}
                    <div className="mt-4">
                      <VerificationHistory patientId={patient.id} />
                    </div>
                  </div>
                )}

                {/* Statistics Chart Placeholder */}
                <div className="bg-gray-50 p-6 rounded-xl mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistik Kepatuhan</h4>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div 
                          key={i}
                          className="w-6 bg-blue-500 rounded-t"
                          style={{ height: `${Math.random() * 60 + 20}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons - Enhanced Navigation with Responsive Design */}
                {!isEditMode && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl mb-6 border border-blue-100">
                    <h4 className="text-sm md:text-base font-semibold text-gray-700 mb-3 md:mb-4 flex items-center space-x-2">
                      <span>🚀</span>
                      <span>Aksi Cepat</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <button
                        onClick={handleAddReminder}
                        className="bg-blue-500 text-white py-3 md:py-4 px-4 md:px-6 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors cursor-pointer text-sm md:text-base shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Buat Pengingat</span>
                      </button>
                      <button
                        onClick={handleViewReminders}
                        className="bg-indigo-500 text-white py-3 md:py-4 px-4 md:px-6 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-colors cursor-pointer text-sm md:text-base shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Lihat Jadwal</span>
                      </button>
                    </div>
                    {/* Usage Tip - Hidden on mobile to save space */}
                    <div className="hidden md:block mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-gray-600">
                        💡 <strong>Tips:</strong> Gunakan "Buat Pengingat" untuk mengakses sistem auto-fill yang canggih dengan template WhatsApp
                      </p>
                    </div>
                  </div>
                )}

                {/* Patient Variables Manager */}
                {!isEditMode && (
                  <div className="mb-6">
                    <PatientVariablesManager 
                      patientId={Array.isArray(params.id) ? params.id[0] : params.id!}
                      patientName={patient?.name || 'Pasien'}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleEdit}
                        className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        Simpan
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEdit}
                        className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        <Edit className="w-5 h-5" />
                        <span>Edit Pasien</span>
                      </button>
                      
                      <button
                        onClick={handleToggleStatus}
                        className={`w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                          patient.isActive 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {patient.isActive ? (
                          <>
                            <User className="w-5 h-5" />
                            <span>Nonaktifkan Pasien</span>
                          </>
                        ) : (
                          <>
                            <User className="w-5 h-5" />
                            <span>Aktifkan Pasien</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Health Notes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Health Notes Header */}
              <div className="bg-blue-500 text-white p-6 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <User className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Catatan Kesehatan</h3>
                </div>
              </div>

              {/* Health Notes Content */}
              <div className="p-6 min-h-[400px]">
                <div className="space-y-3">
                  {healthNotes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Belum ada catatan kesehatan</p>
                      <p className="text-sm">Klik "Tambah Catatan" untuk menambah catatan pertama</p>
                    </div>
                  ) : (
                    healthNotes.map((note) => (
                      <div key={note.id} className="flex space-x-3">
                        {isDeleteMode && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedNotes.includes(note.id)}
                              onChange={() => toggleNoteSelection(note.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        
                        {/* Date Button */}
                        <button className="bg-blue-500 text-white text-sm px-4 py-2 rounded-full font-medium whitespace-nowrap cursor-pointer hover:bg-blue-600 transition-colors">
                          {formatNoteDate(note.date)}
                        </button>
                        
                        {/* Note Content */}
                        <div 
                          className={`flex-1 bg-blue-500 text-white px-4 py-2 rounded-full relative group ${
                            !isDeleteMode ? 'cursor-pointer hover:bg-blue-600 transition-colors' : ''
                          }`}
                          onClick={() => {
                            if (!isDeleteMode) {
                              handleEditNote(note)
                            }
                          }}
                        >
                          <span className="font-medium">{note.note}</span>
                          {!isDeleteMode && (
                            <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit className="w-3 h-3 text-white/80" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Health Notes Footer */}
              <div className="bg-blue-500 p-4 flex space-x-3">
                <button 
                  onClick={() => {
                    setIsAddNoteModalOpen(true)
                    setNewNoteText('')
                    setSelectedDate(new Date().toISOString().split('T')[0])
                    setCurrentMonth(new Date())
                    setShowCalendar(false)
                  }}
                  className="flex-1 bg-white text-blue-500 px-4 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Catatan</span>
                </button>
                <button 
                  onClick={() => {
                    if (isDeleteMode && selectedNotes.length > 0) {
                      handleDeleteSelectedNotes()
                    } else {
                      setIsDeleteMode(!isDeleteMode)
                      setSelectedNotes([])
                    }
                  }}
                  className={`flex-1 px-4 py-3 rounded-full font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-2 ${
                    isDeleteMode && selectedNotes.length > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isDeleteMode && selectedNotes.length > 0 
                      ? `Hapus ${selectedNotes.length} Catatan`
                      : isDeleteMode ? 'Batal' : 'Hapus Catatan'
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Health Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Catatan Kesehatan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
              <div className="mb-4">
                <label className="block text-gray-500 text-sm mb-2">
                  Catatan
                </label>
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Contoh: Gatal-gatal, efek samping obat"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-gray-500 text-sm mb-2">
                  Tanggal
                </label>
                
                {!showCalendar ? (
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-blue-500 font-medium text-center hover:bg-blue-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formatNoteDate(selectedDate)}
                  </button>
                ) : (
                  <div className="border-2 border-blue-200 rounded-xl p-4">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h4 className="text-lg font-semibold text-blue-500">
                        {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, index) => (
                        <div key={index} className="p-2 text-sm font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                      
                      {getCalendarDays().map((day, index) => (
                        <div key={index} className="p-2">
                          {day && (
                            <button
                              onClick={() => handleDateClick(day)}
                              className={`w-8 h-8 rounded text-sm font-medium transition-colors cursor-pointer ${
                                selectedDate === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
                                  ? 'bg-blue-500 text-white'
                                  : 'text-blue-500 hover:bg-blue-50'
                              }`}
                            >
                              {day}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddNoteModalOpen(false)
                setNewNoteText('')
                setSelectedDate(new Date().toISOString().split('T')[0])
                setShowCalendar(false)
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={handleAddNote}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Health Note Modal */}
      <Dialog open={isEditNoteModalOpen && editingNote !== null} onOpenChange={(open) => {
        if (!open) {
          setIsEditNoteModalOpen(false)
          setEditingNote(null)
          setEditNoteText('')
          setEditSelectedDate('')
          setShowEditCalendar(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Catatan Kesehatan Pasien</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
              <div className="mb-4">
                <label className="block text-gray-500 text-sm mb-2">
                  Catatan
                </label>
                <input
                  type="text"
                  value={editNoteText}
                  onChange={(e) => setEditNoteText(e.target.value)}
                  placeholder="Contoh: Gatal-gatal, efek samping obat"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Date Picker for Edit */}
              <div className="mb-6">
                <label className="block text-gray-500 text-sm mb-2">
                  Tanggal
                </label>
                
                {!showEditCalendar ? (
                  <button
                    onClick={() => setShowEditCalendar(true)}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-blue-500 font-medium text-center hover:bg-blue-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formatNoteDate(editSelectedDate)}
                  </button>
                ) : (
                  <div className="border-2 border-blue-200 rounded-xl p-4">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateEditMonth('prev')}
                        className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h4 className="text-lg font-semibold text-blue-500">
                        {editCurrentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={() => navigateEditMonth('next')}
                        className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, index) => (
                        <div key={index} className="p-2 text-sm font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                      
                      {getEditCalendarDays().map((day, index) => (
                        <div key={index} className="p-2">
                          {day && (
                            <button
                              onClick={() => handleEditDateClick(day)}
                              className={`w-8 h-8 rounded text-sm font-medium transition-colors cursor-pointer ${
                                editSelectedDate === new Date(editCurrentMonth.getFullYear(), editCurrentMonth.getMonth(), day).toISOString().split('T')[0]
                                  ? 'bg-blue-500 text-white'
                                  : 'text-blue-500 hover:bg-blue-50'
                              }`}
                            >
                              {day}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditNoteModalOpen(false)
                setEditingNote(null)
                setEditNoteText('')
                setEditSelectedDate('')
                setShowEditCalendar(false)
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={handleSaveEditNote}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Modal */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={handleReminderSuccess}
        patientName={patient?.name || ''}
      />
    </div>
  )
}