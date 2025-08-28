'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, User, ChevronRight, Camera, Upload, X } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'
import { DesktopHeader } from '@/components/ui/desktop-header'
import { formatDateWIB, formatDateTimeWIB } from '@/lib/datetime'
import Image from 'next/image'
import { toast } from 'sonner'

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

export default function PatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState({ name: '', phoneNumber: '', photoUrl: '' })
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string)
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
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
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
          <UserMenu />
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Main Content */}
      <main className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
        {/* Desktop Back Button */}
        <div className="hidden lg:flex items-center space-x-3 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-700" />
            <h2 className="text-2xl font-semibold text-gray-900">Informasi Pasien</h2>
          </div>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden flex items-center space-x-2 mb-6">
          <User className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Informasi Pasien</h2>
        </div>

        {/* Desktop Layout - 2 Column */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Left Column - Profile Picture */}
          <div className="lg:col-span-2">
            {/* Profile Picture */}
            <div className="flex justify-center lg:justify-start mb-8 relative">
              {(photoPreview || patient.photoUrl) ? (
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-4 border-gray-200 relative">
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
                <div className={`w-24 h-24 lg:w-32 lg:h-32 ${getRandomAvatarColor(patient.name)} rounded-full flex items-center justify-center relative`}>
                  <span className="text-white font-bold text-2xl lg:text-3xl">
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
          </div>

          {/* Right Column - Patient Information */}
          <div className="lg:col-span-3">
            {/* Patient Information Forms */}
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-gray-500 text-sm mb-2">Nama pasien</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => isEditMode && setEditData({ ...editData, name: e.target.value })}
                  readOnly={!isEditMode}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 ${
                    isEditMode 
                      ? 'border-blue-200 focus:border-blue-500 focus:outline-none bg-white' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-gray-500 text-sm mb-2">Nomor telepon</label>
                <input
                  type="text"
                  value={editData.phoneNumber}
                  onChange={(e) => isEditMode && setEditData({ ...editData, phoneNumber: e.target.value })}
                  readOnly={!isEditMode}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 ${
                    isEditMode 
                      ? 'border-blue-200 focus:border-blue-500 focus:outline-none bg-white' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            </div>

            {/* Gejala Pasien Button - dengan cursor pointer */}
            <button
              onClick={handleSymptomsClick}
              className="w-full mb-8 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-blue-500 font-medium">Gejala Pasien</span>
              <ChevronRight className="w-5 h-5 text-blue-500" />
            </button>

            {/* Action Buttons */}
            <div className="flex flex-col lg:flex-row gap-4">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Simpan
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Edit className="w-5 h-5" />
                    <span>Edit Pasien</span>
                  </button>
                  
                  <button
                    onClick={handleToggleStatus}
                    className={`flex-1 py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                      patient.isActive 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {patient.isActive ? (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span className="hidden lg:inline">Nonaktifkan Pasien</span>
                        <span className="lg:hidden">Nonaktifkan</span>
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5" />
                        <span className="hidden lg:inline">Aktifkan Pasien</span>
                        <span className="lg:hidden">Aktifkan</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}