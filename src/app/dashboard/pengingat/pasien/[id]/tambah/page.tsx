'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Clock, Calendar, ChevronDown } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { getCurrentDateWIB, getCurrentTimeWIB } from '@/lib/datetime'
import { toast } from '@/components/ui/toast'

interface Patient {
  id: string
  name: string
  phoneNumber: string
}

export default function AddReminderPage() {
  const router = useRouter()
  const params = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false)

  const [formData, setFormData] = useState({
    message: '',
    interval: 'Harian',
    time: getCurrentTimeWIB(),
    startDate: getCurrentDateWIB(),
    totalReminders: 5
  })

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string)
    }
  }, [params.id])

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
        // Set default message
        setFormData(prev => ({
          ...prev,
          message: `Halo ${data.name}, jangan lupa minum obat candesartan pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`
        }))
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    console.log('=== FRONTEND SUBMIT ===')
    console.log('params.id:', params.id)
    console.log('formData:', formData)

    try {
      const response = await fetch(`/api/patients/${params.id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: formData.message,
          interval: formData.interval.toLowerCase(),
          time: formData.time,
          startDate: formData.startDate,
          totalReminders: formData.totalReminders
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Pengingat berhasil dibuat', {
          description: `${result.count || 1} pengingat telah dijadwalkan`
        })
        router.back()
      } else {
        const error = await response.json()
        toast.error('Gagal membuat pengingat', {
          description: error.error || 'Terjadi kesalahan pada server'
        })
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      toast.error('Gagal membuat pengingat', {
        description: 'Terjadi kesalahan jaringan'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const intervalOptions = ['Harian', 'Mingguan']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Field */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Isi Pesan
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Minum obat candesartan"
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
              rows={3}
              required
            />
          </div>

          {/* Interval Field */}
          <div className="relative">
            <label className="block text-gray-500 text-sm mb-2">
              Interval Pengingat
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIntervalDropdown(!showIntervalDropdown)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white text-left flex justify-between items-center"
              >
                <span>{formData.interval}</span>
                <ChevronDown className="w-5 h-5 text-blue-500" />
              </button>
              
              {showIntervalDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-lg z-10">
                  {intervalOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, interval: option })
                        setShowIntervalDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Time Field */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">
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

          {/* Start Date Field */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Tanggal Mulai
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
            </div>
          </div>

          {/* Total Reminders Field */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Jumlah Pengingat
            </label>
            <input
              type="number"
              value={formData.totalReminders}
              onChange={(e) => setFormData({ ...formData, totalReminders: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
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

        {/* Patient Info */}
        {patient && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Pasien:</strong> {patient.name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>WhatsApp:</strong> {patient.phoneNumber}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}