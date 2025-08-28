'use client'

import { useState, useRef } from 'react'
import { User, X, Camera, Upload } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface AddPatientDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddPatientDialog({ isOpen, onClose, onSuccess }: AddPatientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: ''
  })
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let photoUrl = null

      // Upload photo first if selected
      if (photoFile) {
        const photoFormData = new FormData()
        photoFormData.append('photo', photoFile)
        
        const photoResponse = await fetch('/api/upload/patient-photo', {
          method: 'POST',
          body: photoFormData,
        })

        if (photoResponse.ok) {
          const photoData = await photoResponse.json()
          photoUrl = photoData.url
        }
      }

      // Create patient with photo URL
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.whatsappNumber,
          photoUrl: photoUrl,
          isActive: true
        }),
      })

      if (response.ok) {
        setFormData({ name: '', whatsappNumber: '' })
        setPhotoPreview(null)
        setPhotoFile(null)
        onClose()
        if (onSuccess) onSuccess()
      } else {
        console.error('Failed to add patient')
      }
    } catch (error) {
      console.error('Error adding patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', whatsappNumber: '' })
    setPhotoPreview(null)
    setPhotoFile(null)
    onClose()
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File Terlalu Besar', {
          description: 'Ukuran file maksimal 5MB. Silakan pilih file yang lebih kecil.'
        })
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Format File Tidak Valid', {
          description: 'File harus berupa gambar (JPG, PNG, GIF, dll).'
        })
        return
      }

      setPhotoFile(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Tambah Pasien</h2>
          </div>
          <button 
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Photo Upload */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">
              Foto Pasien (Opsional)
            </label>
            <div className="flex items-center justify-center">
              {photoPreview ? (
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-blue-200">
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={handlePhotoClick}
                  className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-dashed border-blue-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mb-1" />
                  <span className="text-xs text-blue-400">Foto</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">
              Nama Pasien
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Stella Maureen Ignacia Santoso"
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* WhatsApp Number Field */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">
              Nomor WhatsApp
            </label>
            <input
              type="text"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              placeholder="087863071881"
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors text-sm sm:text-base cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-2.5 sm:py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm sm:text-base cursor-pointer"
            >
              {loading ? 'Loading...' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}