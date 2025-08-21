'use client'

import { useState } from 'react'
import { User, X } from 'lucide-react'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.whatsappNumber,
          isActive: true
        }),
      })

      if (response.ok) {
        setFormData({ name: '', whatsappNumber: '' })
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
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <User className="w-6 h-6 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Tambah Pasien</h2>
          </div>
          <button 
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}