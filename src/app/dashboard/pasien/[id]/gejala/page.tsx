'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Calendar, Activity } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Header } from '@/components/ui/header'
import { formatDateWIB, formatDateTimeWIB } from '@/lib/datetime'
import { toast } from 'sonner'
import { HealthNotesSkeleton } from '@/components/ui/dashboard-skeleton'

interface Patient {
  id: string
  name: string
}

interface PatientSymptom {
  id: string
  patientId: string
  symptomText: string
  recordedAt: string
  createdAt: string
}

export default function PatientSymptomsPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([])
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSymptom, setEditingSymptom] = useState<PatientSymptom | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchPatientAndSymptoms(params.id as string)
    }
  }, [params.id])

  const fetchPatientAndSymptoms = async (id: string) => {
    try {
      // Fetch patient info
      const patientResponse = await fetch(`/api/patients/${id}`)
      if (patientResponse.ok) {
        const patientData = await patientResponse.json()
        setPatient({ id: patientData.id, name: patientData.name })
      }

      // Fetch symptoms
      const symptomsResponse = await fetch(`/api/patients/${id}/symptoms`)
      if (symptomsResponse.ok) {
        const symptomsData = await symptomsResponse.json()
        setSymptoms(symptomsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSymptomSelection = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    )
  }

  const handleDeleteSymptoms = async () => {
    if (selectedSymptoms.length === 0) return

    // Show confirmation toast instead of native confirm
    const confirmed = await new Promise<boolean>((resolve) => {
      toast.warning(`Hapus ${selectedSymptoms.length} Gejala?`, {
        description: 'Tindakan ini tidak dapat dibatalkan. Data gejala akan dihapus permanen.',
        action: {
          label: 'Hapus',
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
      const response = await fetch(`/api/patients/${params.id}/symptoms`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptomIds: selectedSymptoms }),
      })

      if (response.ok) {
        setSymptoms(prev => prev.filter(s => !selectedSymptoms.includes(s.id)))
        setSelectedSymptoms([])
        setIsDeleteMode(false)
      } else {
        toast.error('Gagal Menghapus', {
          description: 'Tidak dapat menghapus gejala. Coba lagi.'
        })
      }
    } catch (error) {
      console.error('Error deleting symptoms:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat terhubung ke server.'
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
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

        {/* Mobile Header */}
        <div className="lg:hidden relative z-10">
          <header className="bg-white shadow-sm">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Gejala & Catatan</h1>
              <UserButton />
            </div>
          </header>
        </div>

        {/* Main Content with Skeleton */}
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <HealthNotesSkeleton />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white">
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

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header showNavigation={true} />
      </div>

      {/* Main Content */}
      <main className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
        {/* Desktop Back Button & Title */}
        <div className="hidden lg:flex items-center space-x-3 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Gejala Pasien</h2>
            {patient && <span className="text-lg text-gray-600">- {patient.name}</span>}
          </div>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden flex items-center space-x-2 mb-6">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gejala Pasien</h2>
        </div>

        {/* Symptoms List */}
        <div className="space-y-3 mb-8">
          {symptoms.map((symptom) => (
            <div key={symptom.id} className="flex items-center space-x-3">
              {isDeleteMode && (
                <input
                  type="checkbox"
                  checked={selectedSymptoms.includes(symptom.id)}
                  onChange={() => toggleSymptomSelection(symptom.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              )}
              <div 
                className="flex-1 flex space-x-3 cursor-pointer"
                onClick={() => {
                  if (!isDeleteMode) {
                    setEditingSymptom(symptom)
                    setShowEditDialog(true)
                  }
                }}
              >
                <div className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  {formatDate(symptom.recordedAt)}
                </div>
                <div className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm">
                  {symptom.symptomText}
                </div>
              </div>
            </div>
          ))}

          {symptoms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Belum ada gejala yang dicatat</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Responsive positioning */}
        <div className="flex gap-4 lg:static lg:mt-8 fixed lg:relative bottom-6 left-4 right-4 lg:bottom-auto lg:left-auto lg:right-auto lg:flex-row flex-col lg:flex-row lg:max-w-none max-w-none">
          {isDeleteMode ? (
            <>
              <button
                onClick={() => {
                  setIsDeleteMode(false)
                  setSelectedSymptoms([])
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSymptoms}
                disabled={selectedSymptoms.length === 0}
                className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hapus Gejala
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Gejala</span>
              </button>
              
              <button
                onClick={() => setIsDeleteMode(true)}
                disabled={symptoms.length === 0}
                className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span className="hidden lg:inline">Hapus Gejala</span>
                <span className="lg:hidden">Hapus</span>
              </button>
            </>
          )}
        </div>
      </main>

      {/* Add Symptom Dialog */}
      {showAddDialog && (
        <AddSymptomDialog
          isOpen={showAddDialog}
          patientId={params.id as string}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false)
            fetchPatientAndSymptoms(params.id as string)
          }}
        />
      )}

      {/* Edit Symptom Dialog */}
      {showEditDialog && editingSymptom && (
        <EditSymptomDialog
          isOpen={showEditDialog}
          symptom={editingSymptom}
          patientId={params.id as string}
          onClose={() => {
            setShowEditDialog(false)
            setEditingSymptom(null)
          }}
          onSuccess={() => {
            setShowEditDialog(false)
            setEditingSymptom(null)
            fetchPatientAndSymptoms(params.id as string)
          }}
        />
      )}
    </div>
  )
}

// Add Symptom Dialog Component
interface AddSymptomDialogProps {
  isOpen: boolean
  patientId: string
  onClose: () => void
  onSuccess: () => void
}

function AddSymptomDialog({ isOpen, patientId, onClose, onSuccess }: AddSymptomDialogProps) {
  const [formData, setFormData] = useState({
    symptomText: '',
    recordedAt: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Set default datetime to now in WIB
      const now = new Date()
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
      const isoString = wibTime.toISOString().slice(0, 16)
      setFormData({
        symptomText: '',
        recordedAt: isoString
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/patients/${patientId}/symptoms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        toast.error('Gagal Menambah Gejala', {
          description: 'Tidak dapat menambahkan gejala baru. Coba lagi.'
        })
      }
    } catch (error) {
      console.error('Error adding symptom:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat terhubung ke server.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tambah Gejala</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-2">
              Tanggal & Waktu
            </label>
            <input
              type="datetime-local"
              value={formData.recordedAt}
              onChange={(e) => setFormData({ ...formData, recordedAt: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-2">
              Gejala
            </label>
            <textarea
              value={formData.symptomText}
              onChange={(e) => setFormData({ ...formData, symptomText: e.target.value })}
              placeholder="Masukkan gejala yang dialami pasien..."
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
              rows={3}
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Symptom Dialog Component
interface EditSymptomDialogProps {
  isOpen: boolean
  symptom: PatientSymptom
  patientId: string
  onClose: () => void
  onSuccess: () => void
}

function EditSymptomDialog({ isOpen, symptom, patientId, onClose, onSuccess }: EditSymptomDialogProps) {
  const [formData, setFormData] = useState({
    symptomText: '',
    recordedAt: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && symptom) {
      // Convert the symptom data to form format
      const recordedDate = new Date(symptom.recordedAt)
      const wibTime = new Date(recordedDate.getTime() + (7 * 60 * 60 * 1000))
      const isoString = wibTime.toISOString().slice(0, 16)
      
      setFormData({
        symptomText: symptom.symptomText,
        recordedAt: isoString
      })
    }
  }, [isOpen, symptom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/patients/${patientId}/symptoms/${symptom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        toast.error('Gagal Update Gejala', {
          description: 'Tidak dapat memperbarui data gejala. Coba lagi.'
        })
      }
    } catch (error) {
      console.error('Error updating symptom:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat terhubung ke server.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Edit Gejala Pasien</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Waktu
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={formData.recordedAt}
                onChange={(e) => setFormData({ ...formData, recordedAt: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Gejala Pasien
            </label>
            <input
              type="text"
              value={formData.symptomText}
              onChange={(e) => setFormData({ ...formData, symptomText: e.target.value })}
              placeholder="Gatal-gatal, benjolan"
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}