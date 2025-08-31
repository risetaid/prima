'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, User, ChevronRight, Camera, Upload, X, Plus, ChevronLeft, Calendar, MessageSquare, Clock, Repeat, ChevronDown, Zap } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'
import { DesktopHeader } from '@/components/ui/desktop-header'
import { formatDateWIB, formatDateTimeWIB } from '@/lib/datetime'
import Image from 'next/image'
import { toast } from 'sonner'
import { getCurrentTimeWIB } from '@/lib/datetime'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'

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
  
  // Modal Reminder States
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [autoFillData, setAutoFillData] = useState<AutoFillData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false)
  const [customRecurrence, setCustomRecurrence] = useState({
    enabled: false,
    frequency: 'week' as 'day' | 'week' | 'month',
    interval: 1,
    daysOfWeek: [] as number[], // 0=Sunday, 1=Monday, etc.
    endType: 'never' as 'never' | 'on' | 'after',
    endDate: '',
    occurrences: 1
  })
  const [reminderFormData, setReminderFormData] = useState({
    message: '',
    time: getCurrentTimeWIB()
  })

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
      } else {
        console.error('Patient not found')
        router.push('/dashboard/pasien')
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
      router.push('/dashboard/pasien')
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
      } else {
        console.error('Failed to fetch health notes:', response.status)
        toast.error('Gagal memuat catatan kesehatan')
      }
    } catch (error) {
      console.error('Error fetching health notes:', error)
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
      console.error('Error updating health note:', error)
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
      console.error('Error deleting health notes:', error)
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

  // Enhanced Reminder Modal Functions
  const handleAddReminder = async () => {
    setIsReminderModalOpen(true)
    await fetchAutoFillData()
    await fetchTemplates()
  }

  const handleViewReminders = () => {
    router.push(`/dashboard/pengingat/pasien/${params.id}`)
  }

  const fetchAutoFillData = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/autofill`)
      if (response.ok) {
        const data = await response.json()
        setAutoFillData(data.autoFillData)
      }
    } catch (error) {
      console.error('Error fetching auto-fill data:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates') // Remove category filter to get all templates
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Templates fetched:', data.templates?.length || 0)
        console.log('🎯 Template data:', data.templates)
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template && autoFillData) {
      setSelectedTemplate(templateId)
      // Apply template with auto-filled data
      const messageWithData = applyTemplateVariables(template.templateText, {
        nama: autoFillData.nama,
        obat: autoFillData.obat || '',
        dosis: autoFillData.dosis || '',
        waktu: reminderFormData.time,
        tanggal: selectedDates.length > 0 ? selectedDates[0] : '{tanggal}',
        dokter: autoFillData.dokter || '',
        rumahSakit: autoFillData.rumahSakit || '',
        volunteer: autoFillData.volunteer
      })
      setReminderFormData(prev => ({ ...prev, message: messageWithData }))
    }
    setIsTemplateDropdownOpen(false)
  }

  const handleAutoFillMessage = () => {
    if (!autoFillData || !reminderFormData.message) return

    let updatedMessage = reminderFormData.message

    // Auto-fill common variables if they exist in the message
    const autoFillMap = {
      '{obat}': autoFillData.obat || '',
      '{dosis}': autoFillData.dosis || '',
      '{dokter}': autoFillData.dokter || '',
      '{rumahSakit}': autoFillData.rumahSakit || '',
      '{nama}': autoFillData.nama,
      '{volunteer}': autoFillData.volunteer,
      '{waktu}': reminderFormData.time,
      '{tanggal}': selectedDates.length > 0 ? selectedDates[0] : '{tanggal}'
    }

    Object.entries(autoFillMap).forEach(([placeholder, value]) => {
      if (value) {
        updatedMessage = updatedMessage.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          value
        )
      }
    })

    setReminderFormData(prev => ({ ...prev, message: updatedMessage }))
    
    toast.success('Data berhasil diisi otomatis!', {
      description: 'Variabel dalam pesan telah diisi dengan data pasien'
    })
  }

  const applyTemplateVariables = (text: string, variables: Record<string, string>) => {
    let result = text
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input based on recurrence type
    if (!customRecurrence.enabled) {
      // Regular date selection validation
      if (selectedDates.length === 0) {
        toast.error('Pilih tanggal pengingat')
        return
      }
    } else {
      // Custom recurrence validation
      if (customRecurrence.frequency === 'week' && customRecurrence.daysOfWeek.length === 0) {
        toast.error('Pilih hari dalam seminggu untuk pengulangan')
        return
      }
    }

    setSubmitting(true)
    
    try {
      const requestBody = {
        message: reminderFormData.message,
        time: reminderFormData.time,
        ...(customRecurrence.enabled ? {
          customRecurrence: {
            frequency: customRecurrence.frequency,
            interval: customRecurrence.interval,
            daysOfWeek: customRecurrence.daysOfWeek,
            endType: customRecurrence.endType,
            endDate: customRecurrence.endDate || null,
            occurrences: customRecurrence.occurrences
          }
        } : {
          dates: selectedDates
        })
      }

      const response = await fetch(`/api/patients/${params.id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        toast.success('Pengingat berhasil dibuat!')
        
        // Reset form
        setReminderFormData({ message: '', time: getCurrentTimeWIB() })
        setSelectedDates([])
        setSelectedTemplate('')
        setCustomRecurrence({
          enabled: false,
          frequency: 'week',
          interval: 1,
          daysOfWeek: [],
          endType: 'never',
          endDate: '',
          occurrences: 1
        })
        setIsReminderModalOpen(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Gagal membuat pengingat')
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      toast.error('Terjadi kesalahan saat membuat pengingat')
    } finally {
      setSubmitting(false)
    }
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

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Patient not found</p>
        </div>
      </div>
    )
  }

  // Using WIB timezone utilities

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
      {/* Mobile Header */}
      <header className="lg:hidden bg-white relative z-10">
        <div className="flex justify-between items-center px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-blue-600" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          <UserMenu />
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden lg:block relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Desktop: Blue Header Section */}
      <div className="hidden lg:block bg-blue-500 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h1 className="text-white text-3xl font-bold">Informasi Pasien</h1>
        </div>
      </div>

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
                        <button className="bg-blue-500 text-white text-sm px-4 py-2 rounded-full font-medium whitespace-nowrap">
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
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Tambah Catatan Kesehatan</h3>
              <button
                onClick={() => {
                  setIsAddNoteModalOpen(false)
                  setNewNoteText('')
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
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
            
            {/* Modal Footer */}
            <div className="flex space-x-4 p-6">
              <button
                onClick={() => {
                  setIsAddNoteModalOpen(false)
                  setNewNoteText('')
                  setSelectedDate(new Date().toISOString().split('T')[0])
                  setShowCalendar(false)
                }}
                className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
              <button
                onClick={handleAddNote}
                className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Health Note Modal */}
      {isEditNoteModalOpen && editingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Catatan Kesehatan Pasien</h3>
              <button
                onClick={() => {
                  setIsEditNoteModalOpen(false)
                  setEditingNote(null)
                  setEditNoteText('')
                  setEditSelectedDate('')
                  setShowEditCalendar(false)
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
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
            
            {/* Modal Footer */}
            <div className="flex space-x-4 p-6">
              <button
                onClick={() => {
                  setIsEditNoteModalOpen(false)
                  setEditingNote(null)
                  setEditNoteText('')
                  setEditSelectedDate('')
                  setShowEditCalendar(false)
                }}
                className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
              <button
                onClick={handleSaveEditNote}
                className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reminder Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Buat Pengingat</h3>
                {patient && (
                  <p className="text-sm text-gray-600">untuk {patient.name}</p>
                )}
              </div>
              <button
                onClick={() => setIsReminderModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleReminderSubmit} className="space-y-6">
                {/* Message Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-500 text-sm">
                      Isi Pesan
                    </label>
                    
                    <div className="flex items-center space-x-2">
                      {/* Auto-fill Button */}
                      {autoFillData && reminderFormData.message && (
                        <button
                          type="button"
                          onClick={handleAutoFillMessage}
                          className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-xs"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Auto-isi</span>
                        </button>
                      )}

                      {/* Template Dropdown */}
                      {templates.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                            className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm"
                          >
                            <span>📝 Template</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isTemplateDropdownOpen && (
                            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="max-h-48 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTemplate('')
                                    setReminderFormData(prev => ({ ...prev, message: '' }))
                                    setIsTemplateDropdownOpen(false)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                                >
                                  <span className="font-medium">Kosongkan</span>
                                  <p className="text-xs text-gray-500">Tulis pesan sendiri</p>
                                </button>
                                {/* Group templates by category */}
                                {['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'].map((category) => {
                                  const categoryTemplates = templates.filter(t => t.category === category)
                                  if (categoryTemplates.length === 0) return null
                                  
                                  const categoryLabels = {
                                    REMINDER: '💊 Pengingat',
                                    APPOINTMENT: '📅 Janji Temu', 
                                    EDUCATIONAL: '📚 Edukasi'
                                  }
                                  
                                  return (
                                    <div key={category}>
                                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                                        {categoryLabels[category as keyof typeof categoryLabels]}
                                      </div>
                                      {categoryTemplates.map((template) => (
                                        <button
                                          key={template.id}
                                          type="button"
                                          onClick={() => handleTemplateSelect(template.id)}
                                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                            selectedTemplate === template.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                          }`}
                                        >
                                          <span className="font-medium">{template.templateName}</span>
                                          <p className="text-xs text-gray-500 mt-1 truncate">{template.templateText}</p>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <textarea
                    value={reminderFormData.message}
                    onChange={(e) => setReminderFormData({ ...reminderFormData, message: e.target.value })}
                    placeholder={templates.length > 0 ? "Pilih template atau tulis pesan sendiri..." : "Tulis pesan pengingat..."}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    rows={4}
                    required
                  />
                  
                  {/* Enhanced Auto-fill Data Preview */}
                  {autoFillData && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Data Tersedia untuk Auto-isi</span>
                        </h4>
                        {!reminderFormData.message && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                            Tulis pesan dulu
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Patient Basic Info */}
                        {autoFillData.nama && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Nama Pasien</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.nama}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{nama}'}</div>
                          </div>
                        )}
                        
                        {autoFillData.nomor && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">No. WhatsApp</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.nomor}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{nomor}'}</div>
                          </div>
                        )}
                        
                        {/* Medical Info */}
                        {autoFillData.obat && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Nama Obat</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.obat}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{obat}'}</div>
                          </div>
                        )}
                        
                        {autoFillData.dosis && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Dosis</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.dosis}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{dosis}'}</div>
                          </div>
                        )}
                        
                        {autoFillData.dokter && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Nama Dokter</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.dokter}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{dokter}'}</div>
                          </div>
                        )}
                        
                        {autoFillData.rumahSakit && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Rumah Sakit</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.rumahSakit}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{rumahSakit}'}</div>
                          </div>
                        )}
                        
                        {autoFillData.volunteer && (
                          <div className="bg-white p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Volunteer</div>
                            <div className="text-sm font-medium text-gray-800">{autoFillData.volunteer}</div>
                            <div className="text-xs text-blue-600 mt-1">{'{volunteer}'}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Usage Guide */}
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            💡 <strong>Tips:</strong> Ketik variabel seperti <span className="bg-blue-100 text-blue-800 px-1 rounded">{'{nama}'}</span> di pesan, lalu klik 
                            <span className="ml-1 inline-flex items-center bg-green-100 text-green-700 px-1 rounded text-xs">
                              <Zap className="w-3 h-3 mr-1" />Auto-isi
                            </span>
                          </div>
                          {reminderFormData.message && (
                            <button
                              type="button"
                              onClick={handleAutoFillMessage}
                              className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Auto-isi Sekarang</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Field */}
                <div>
                  <label className="block text-gray-500 text-sm mb-2">
                    Waktu Pengingat (WIB)
                  </label>
                  <input
                    type="time"
                    value={reminderFormData.time}
                    onChange={(e) => setReminderFormData({ ...reminderFormData, time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Date Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-500 text-sm">
                      Pilih Tanggal
                    </label>
                  </div>
                  
                  <DatePickerCalendar
                    selectedDates={selectedDates}
                    onDateSelect={setSelectedDates}
                    multiple={true}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsReminderModalOpen(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
                  >
                    ✕ Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <span>▶</span>
                    <span>{submitting ? 'Loading...' : 'Submit'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}