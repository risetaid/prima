'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { toast } from 'sonner'

export default function AddPatientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    birthDate: '',
    diagnosisDate: '',
    cancerStage: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/dashboard/pasien')
      } else {
        const error = await response.json()
        toast.error('Gagal Menambahkan Pasien', {
          description: `Error: ${error.error || 'Terjadi kesalahan pada server'}`
        })
      }
    } catch (error) {
      console.error('Error creating patient:', error)
      toast.error('Kesalahan Jaringan', {
        description: 'Tidak dapat menambahkan pasien. Periksa koneksi internet Anda.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Tambah Pasien</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm">
          {/* Nama Pasien */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Pasien *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Nomor HP */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor HP *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Alamat */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alamat
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tanggal Lahir */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Lahir
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tanggal Diagnosis */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Diagnosis
            </label>
            <input
              type="date"
              name="diagnosisDate"
              value={formData.diagnosisDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Stadium Kanker */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stadium Kanker
            </label>
            <select
              name="cancerStage"
              value={formData.cancerStage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Pilih Stadium</option>
              <option value="I">Stadium I</option>
              <option value="II">Stadium II</option>
              <option value="III">Stadium III</option>
              <option value="IV">Stadium IV</option>
            </select>
          </div>

          {/* Kontak Darurat - Nama */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Kontak Darurat
            </label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Kontak Darurat - HP */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HP Kontak Darurat
            </label>
            <input
              type="tel"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Catatan */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Tambahan
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Menyimpan...' : 'Simpan Pasien'}
          </button>
        </form>
      </main>
    </div>
  )
}

