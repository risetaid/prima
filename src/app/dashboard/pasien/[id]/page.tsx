'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, User, ChevronRight } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { formatDateWIB, formatDateTimeWIB } from '@/lib/datetime'
import Image from 'next/image'

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
  const [editData, setEditData] = useState({ name: '', phoneNumber: '' })

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
        setEditData({ name: data.name, phoneNumber: data.phoneNumber })
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

  const handleEdit = () => {
    if (isEditMode) {
      handleSave()
    } else {
      setIsEditMode(true)
    }
  }

  const handleCancel = () => {
    setIsEditMode(false)
    if (patient) {
      setEditData({ name: patient.name, phoneNumber: patient.phoneNumber })
    }
  }

  const handleSave = async () => {
    if (!patient) return

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editData.name,
          phoneNumber: editData.phoneNumber
        })
      })

      if (response.ok) {
        const updatedPatient = await response.json()
        setPatient(updatedPatient)
        setIsEditMode(false)
      } else {
        alert('Gagal menyimpan perubahan')
      }
    } catch (error) {
      console.error('Error updating patient:', error)
      alert('Gagal menyimpan perubahan')
    }
  }

  const handleSymptomsClick = () => {
    router.push(`/dashboard/pasien/${params.id}/gejala`)
  }

  const handleDelete = async () => {
    if (!patient) return
    
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus pasien ${patient.name}?`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/dashboard/pasien')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting patient:', error)
      alert('Gagal menghapus pasien')
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
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <User className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Informasi Pasien</h2>
        </div>

        {/* Profile Picture */}
        <div className="flex justify-center mb-8">
          {patient.photoUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200">
              <Image
                src={patient.photoUrl}
                alt={patient.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {getInitials(patient.name)}
              </span>
            </div>
          )}
        </div>

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

        {/* Gejala Pasien Button */}
        <button
          onClick={handleSymptomsClick}
          className="w-full mb-8 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <span className="text-blue-500 font-medium">Gejala Pasien</span>
          <ChevronRight className="w-5 h-5 text-blue-500" />
        </button>

        {/* Action Buttons */}
        <div className="flex gap-4">
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
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
                <span>Hapus Pasien</span>
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}