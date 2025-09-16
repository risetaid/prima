'use client'

import { useState, useRef } from 'react'
import { User, X, Camera } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

type CancerStageOption = '' | 'I' | 'II' | 'III' | 'IV'

interface PatientFormData {
  name: string
  phoneNumber: string
  address: string
  birthDate: string
  diagnosisDate: string
  cancerStage: CancerStageOption
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
}

interface CreatePatientPayload {
  name: string
  phoneNumber: string
  address?: string
  birthDate?: string
  diagnosisDate?: string
  cancerStage?: 'I' | 'II' | 'III' | 'IV'
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  photoUrl?: string
}

interface AddPatientDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddPatientDialog({ isOpen, onClose, onSuccess }: AddPatientDialogProps) {
  const createInitialFormState = (): PatientFormData => ({
    name: '',
    phoneNumber: '',
    address: '',
    birthDate: '',
    diagnosisDate: '',
    cancerStage: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  })

  const [formData, setFormData] = useState<PatientFormData>(createInitialFormState)
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData(createInitialFormState())
    setPhotoPreview(null)
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const trimmedName = formData.name.trim()
      const trimmedPhone = formData.phoneNumber.trim()

      if (!trimmedName || !trimmedPhone) {
        toast.error('Nama dan nomor WhatsApp wajib diisi')
        setLoading(false)
        return
      }

      let photoUrl = null

      // Upload photo first if selected
      if (photoFile) {
        const photoFormData = new FormData()
        photoFormData.append('photo', photoFile)
        
        const photoResponse = await fetch('/api/upload?type=patient-photo', {
          method: 'POST',
          body: photoFormData,
        })

        if (photoResponse.ok) {
          const photoData = await photoResponse.json()
          photoUrl = photoData.url
        }
      }

      const payload: CreatePatientPayload = {
        name: trimmedName,
        phoneNumber: trimmedPhone,
      }

      if (formData.address.trim()) payload.address = formData.address.trim()
      if (formData.birthDate) payload.birthDate = formData.birthDate
      if (formData.diagnosisDate) payload.diagnosisDate = formData.diagnosisDate
      if (formData.cancerStage) payload.cancerStage = formData.cancerStage
      if (formData.emergencyContactName.trim())
        payload.emergencyContactName = formData.emergencyContactName.trim()
      if (formData.emergencyContactPhone.trim())
        payload.emergencyContactPhone = formData.emergencyContactPhone.trim()
      if (formData.notes.trim()) payload.notes = formData.notes.trim()
      if (photoUrl) payload.photoUrl = photoUrl

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Pasien berhasil ditambahkan')
        resetForm()
        onClose()
        if (onSuccess) onSuccess()
      } else {
        const errorBody = await response.json().catch(() => ({ error: 'Terjadi kesalahan' }))
        toast.error('Gagal menambahkan pasien', {
          description: errorBody?.error || 'Terjadi kesalahan pada server',
        })
        logger.warn('Failed to add patient via modal', { status: response.status })
      }
    } catch (error) {
      logger.error('Error adding patient via modal', error as Error)
      toast.error('Kesalahan jaringan', {
        description: 'Tidak dapat menambahkan pasien. Periksa koneksi internet Anda.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    resetForm()
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            <span>Tambah Pasien</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 gap-4">
            <div>
            <label className="block text-gray-600 text-sm mb-2" htmlFor="name">
              Nama Pasien <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Stella Maureen Ignacia Santoso"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
            <label className="block text-gray-600 text-sm mb-2" htmlFor="phoneNumber">
              Nomor WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="087863071881"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-2" htmlFor="address">
                Alamat
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Jl. Sehat No. 123, Jakarta"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-2" htmlFor="birthDate">
                  Tanggal Lahir
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-2" htmlFor="diagnosisDate">
                  Tanggal Diagnosis
                </label>
                <input
                  id="diagnosisDate"
                  name="diagnosisDate"
                  type="date"
                  value={formData.diagnosisDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-2" htmlFor="cancerStage">
                Stadium Kanker
              </label>
              <select
                id="cancerStage"
                name="cancerStage"
                value={formData.cancerStage}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">Pilih Stadium</option>
                <option value="I">Stadium I</option>
                <option value="II">Stadium II</option>
                <option value="III">Stadium III</option>
                <option value="IV">Stadium IV</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-2" htmlFor="emergencyContactName">
                  Nama Kontak Darurat
                </label>
                <input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  placeholder="Nama Kontak"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-2" htmlFor="emergencyContactPhone">
                  Nomor Kontak Darurat
                </label>
                <input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={handleInputChange}
                  placeholder="08123456789"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-2" htmlFor="notes">
                Catatan Tambahan
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Catatan kesehatan atau preferensi pasien"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-3 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Menyimpan...' : 'Tambah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

