'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Clock, Repeat, X, ChevronDown } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'
import { getCurrentTimeWIB } from '@/lib/datetime'
import { toast } from '@/components/ui/toast'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'

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
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [customRecurrence, setCustomRecurrence] = useState({
    enabled: false,
    frequency: 'week' as 'day' | 'week' | 'month',
    interval: 1,
    daysOfWeek: [] as number[], // 0=Sunday, 1=Monday, etc.
    endType: 'never' as 'never' | 'on' | 'after',
    endDate: '',
    occurrences: 1
  })

  const [formData, setFormData] = useState({
    message: '',
    time: getCurrentTimeWIB()
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
        // Message field will remain empty for template system
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input based on recurrence type
    if (!customRecurrence.enabled) {
      // Regular date selection validation
      if (selectedDates.length === 0) {
        toast.error('Pilih minimal satu tanggal', {
          description: 'Anda harus memilih setidaknya satu tanggal untuk pengingat'
        })
        return
      }
    } else {
      // Custom recurrence validation
      if (customRecurrence.frequency === 'week' && customRecurrence.daysOfWeek.length === 0) {
        toast.error('Pilih minimal satu hari', {
          description: 'Untuk pengulangan mingguan, pilih setidaknya satu hari'
        })
        return
      }
      if (customRecurrence.endType === 'on' && !customRecurrence.endDate) {
        toast.error('Pilih tanggal berakhir', {
          description: 'Tentukan tanggal berakhir untuk pengulangan'
        })
        return
      }
    }
    
    setSubmitting(true)

    console.log('=== FRONTEND SUBMIT ===')
    console.log('params.id:', params.id)
    console.log('formData:', formData)
    console.log('selectedDates:', selectedDates)
    console.log('customRecurrence:', customRecurrence)

    try {
      const requestBody = {
        message: formData.message,
        time: formData.time,
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
          selectedDates: selectedDates
        })
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
          <UserMenu />
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
              placeholder=""
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
              rows={3}
              required
            />
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

          {/* Date Selection Field */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">
              Pilih Tanggal Pengingat
            </label>
            <DatePickerCalendar
              selectedDates={selectedDates}
              onDateChange={setSelectedDates}
            />
            
            {/* Custom Recurrence Option */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCustomRecurrenceOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Repeat className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {customRecurrence.enabled ? 'Pengulangan kustom aktif' : 'Pengulangan kustom'}
                </span>
              </button>
              
              {customRecurrence.enabled && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Ulangi setiap {customRecurrence.interval} {customRecurrence.frequency === 'day' ? 'hari' : customRecurrence.frequency === 'week' ? 'minggu' : 'bulan'}
                    {customRecurrence.daysOfWeek.length > 0 && customRecurrence.frequency === 'week' && (
                       <span> pada {customRecurrence.daysOfWeek.map(day => {
                         const dayMap: {[key: string]: string} = {
                           'sun': 'Minggu', 'mon': 'Senin', 'tue': 'Selasa', 'wed': 'Rabu',
                           'thu': 'Kamis', 'fri': 'Jumat', 'sat': 'Sabtu'
                         }
                         return dayMap[day]
                       }).join(', ')}</span>
                     )}
                    {customRecurrence.endType === 'on' && ` sampai ${customRecurrence.endDate}`}
                    {customRecurrence.endType === 'after' && ` selama ${customRecurrence.occurrences} kejadian`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCustomRecurrence(prev => ({ ...prev, enabled: false }))}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Hapus pengulangan kustom
                  </button>
                </div>
              )}
            </div>
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
      
      {/* Custom Recurrence Modal */}
      {isCustomRecurrenceOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Pengulangan Kustom</h3>
              <button
                onClick={() => setIsCustomRecurrenceOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Repeat every */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ulangi setiap
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customRecurrence.interval}
                    onChange={(e) => setCustomRecurrence(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={customRecurrence.frequency}
                    onChange={(e) => setCustomRecurrence(prev => ({ ...prev, frequency: e.target.value as 'day' | 'week' | 'month' }))}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="day">hari</option>
                    <option value="week">minggu</option>
                    <option value="month">bulan</option>
                  </select>
                </div>
              </div>
              
              {/* Repeat on (for weekly) */}
              {customRecurrence.frequency === 'week' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ulangi pada
                  </label>
                  <div className="flex space-x-1">
                    {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newDays = customRecurrence.daysOfWeek.includes(index)
                            ? customRecurrence.daysOfWeek.filter(d => d !== index)
                            : [...customRecurrence.daysOfWeek, index]
                          setCustomRecurrence(prev => ({ ...prev, daysOfWeek: newDays }))
                        }}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                          customRecurrence.daysOfWeek.includes(index)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Ends */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berakhir
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="endType"
                      value="never"
                      checked={customRecurrence.endType === 'never'}
                      onChange={(e) => setCustomRecurrence(prev => ({ ...prev, endType: e.target.value as 'never' | 'on' | 'after' }))}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-gray-700">Tidak pernah</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="endType"
                      value="on"
                      checked={customRecurrence.endType === 'on'}
                      onChange={(e) => setCustomRecurrence(prev => ({ ...prev, endType: e.target.value as 'never' | 'on' | 'after' }))}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-gray-700">Pada tanggal</span>
                    <input
                      type="date"
                      value={customRecurrence.endDate}
                      onChange={(e) => setCustomRecurrence(prev => ({ ...prev, endDate: e.target.value }))}
                      disabled={customRecurrence.endType !== 'on'}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="endType"
                      value="after"
                      checked={customRecurrence.endType === 'after'}
                      onChange={(e) => setCustomRecurrence(prev => ({ ...prev, endType: e.target.value as 'never' | 'on' | 'after' }))}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-gray-700">Setelah</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={customRecurrence.occurrences}
                      onChange={(e) => setCustomRecurrence(prev => ({ ...prev, occurrences: parseInt(e.target.value) || 1 }))}
                      disabled={customRecurrence.endType !== 'after'}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-700">kejadian</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex space-x-3 p-4 border-t flex-shrink-0">
              <button
                onClick={() => setIsCustomRecurrenceOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setCustomRecurrence(prev => ({ ...prev, enabled: true }))
                  setIsCustomRecurrenceOpen(false)
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}