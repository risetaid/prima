'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { X, Clock, Repeat, ChevronDown, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface Patient {
  id: string
  name: string
  phoneNumber: string
}

interface AddReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  patientName: string
}

export function AddReminderModal({ isOpen, onClose, onSuccess, patientName }: AddReminderModalProps) {
  const params = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    message: '',
    time: '08:00'
  })

  useEffect(() => {
    if (isOpen && params.id) {
      fetchPatient(params.id as string)
      // Reset form when opened
      setFormData({
        message: '',
        time: '08:00'
      })
      setSelectedDates([])
    }
  }, [isOpen, params.id])

  const fetchPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`)
      if (response.ok) {
        const data = await response.json()
        setPatient({
          id: data.id,
          name: data.name,
          phoneNumber: data.phoneNumber
        })
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedDates.length === 0) {
      toast.error('Pilih minimal satu tanggal')
      return
    }
    
    setSubmitting(true)

    try {
      const requestBody = {
        message: formData.message,
        time: formData.time,
        selectedDates: selectedDates
      }

      const response = await fetch(`/api/patients/${params.id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Pengingat berhasil dibuat - ${result.count || 1} pengingat dijadwalkan`)
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal membuat pengingat')
      }
    } catch (error) {
      toast.error('Gagal membuat pengingat')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Tambah Pengingat Baru
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Info */}
              {patient && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <strong>Pasien:</strong> {patient.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>WhatsApp:</strong> {patient.phoneNumber}
                  </p>
                </div>
              )}

              {/* Message Field */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Isi Pesan
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tulis pesan pengingat..."
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  rows={4}
                  required
                />
              </div>

              {/* Time Field */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Jam Pengingat
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    required
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                </div>
              </div>

              {/* Date Selection Field */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Pilih Tanggal Pengingat
                </label>
                <div className="border-2 border-blue-200 rounded-xl p-4">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      if (e.target.value && !selectedDates.includes(e.target.value)) {
                        setSelectedDates([...selectedDates, e.target.value])
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Selected Dates */}
                  {selectedDates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Tanggal terpilih:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDates.map((date, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {new Date(date).toLocaleDateString('id-ID')}
                            <button
                              type="button"
                              onClick={() => setSelectedDates(selectedDates.filter((_, i) => i !== index))}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!loading && (
          <div className="flex space-x-4 p-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Loading...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}