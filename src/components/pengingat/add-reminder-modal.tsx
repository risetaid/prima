'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { X, Clock, Repeat, ChevronDown, Zap } from 'lucide-react'
import { getCurrentTimeWIB } from '@/lib/datetime'
import { toast } from 'sonner'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'

interface Patient {
  id: string
  name: string
  phoneNumber: string
}

interface WhatsAppTemplate {
  id: string
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

interface AutoFillData {
  nama: string
  nomor: string
  obat?: string
  dosis?: string
  dokter?: string
  rumahSakit?: string
  volunteer: string
  waktu?: string
  tanggal?: string
  dataContext?: {
    hasActiveMedications: boolean
    hasRecentReminders: boolean
    hasMedicalRecords: boolean
    assignedVolunteerName?: string
    currentUserName?: string
  }
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
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false)
  const [autoFillData, setAutoFillData] = useState<AutoFillData | null>(null)
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
    if (isOpen && params.id) {
      fetchPatient(params.id as string)
      fetchTemplates()
      fetchAutoFillData(params.id as string)
      // Reset form when opened
      setFormData({
        message: '',
        time: getCurrentTimeWIB()
      })
      setSelectedDates([])
      setCustomRecurrence({
        enabled: false,
        frequency: 'week',
        interval: 1,
        daysOfWeek: [],
        endType: 'never',
        endDate: '',
        occurrences: 1
      })
      setSelectedTemplate('')
    }
  }, [isOpen, params.id])

  // Close template dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isTemplateDropdownOpen && !(event.target as Element)?.closest('.template-dropdown')) {
        setIsTemplateDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isTemplateDropdownOpen])

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

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates') // Remove category filter to get all templates
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Modal Templates fetched:', data.templates?.length || 0)
        console.log('🎯 Modal Template data:', data.templates)
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchAutoFillData = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/autofill`)
      if (response.ok) {
        const data = await response.json()
        setAutoFillData(data.autoFillData)
      }
    } catch (error) {
      console.error('Error fetching auto-fill data:', error)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template && autoFillData) {
      setSelectedTemplate(templateId)
      // Apply template with auto-filled data
      const messageWithData = applyTemplateVariables(template.templateText, {
        nama: autoFillData.nama,
        obat: autoFillData.obat || '{obat}',
        dosis: autoFillData.dosis || '{dosis}',
        waktu: formData.time,
        tanggal: selectedDates.length > 0 ? selectedDates[0] : '{tanggal}',
        dokter: autoFillData.dokter || '{dokter}',
        rumahSakit: autoFillData.rumahSakit || '{rumahSakit}',
        volunteer: autoFillData.volunteer
      })
      setFormData(prev => ({ ...prev, message: messageWithData }))
    } else if (template) {
      setSelectedTemplate(templateId)
      // Fallback to basic template if no autoFillData
      const messageWithData = applyTemplateVariables(template.templateText, {
        nama: patient?.name || '{nama}',
        obat: '{obat}',
        dosis: '{dosis}',
        waktu: formData.time,
        tanggal: selectedDates.length > 0 ? selectedDates[0] : '{tanggal}',
        dokter: '{dokter}',
        rumahSakit: '{rumahSakit}',
        volunteer: '{volunteer}'
      })
      setFormData(prev => ({ ...prev, message: messageWithData }))
    }
    setIsTemplateDropdownOpen(false)
  }

  const handleAutoFillMessage = () => {
    if (!autoFillData || !formData.message) return

    let updatedMessage = formData.message

    // Auto-fill common variables if they exist in the message
    const autoFillMap = {
      '{obat}': autoFillData.obat,
      '{dosis}': autoFillData.dosis,
      '{dokter}': autoFillData.dokter,
      '{rumahSakit}': autoFillData.rumahSakit,
      '{nama}': autoFillData.nama,
      '{volunteer}': autoFillData.volunteer,
      '{waktu}': formData.time,
      '{tanggal}': selectedDates.length > 0 ? selectedDates[0] : '{tanggal}'
    }

    Object.entries(autoFillMap).forEach(([placeholder, value]) => {
      if (value) {
        updatedMessage = updatedMessage.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          value
        )
      }
    })

    setFormData(prev => ({ ...prev, message: updatedMessage }))
    toast.success('Pesan berhasil diisi otomatis!')
  }

  const applyTemplateVariables = (text: string, variables: Record<string, string>) => {
    let result = text
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input based on recurrence type
    if (!customRecurrence.enabled) {
      // Regular date selection validation
      if (selectedDates.length === 0) {
        toast.error('Pilih minimal satu tanggal')
        return
      }
    } else {
      // Custom recurrence validation
      if (customRecurrence.frequency === 'week' && customRecurrence.daysOfWeek.length === 0) {
        toast.error('Pilih minimal satu hari')
        return
      }
      if (customRecurrence.endType === 'on' && !customRecurrence.endDate) {
        toast.error('Pilih tanggal berakhir')
        return
      }
    }
    
    setSubmitting(true)

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
        toast.success(`Pengingat berhasil dibuat - ${result.count || 1} pengingat dijadwalkan`)
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal membuat pengingat')
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
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
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Tambah Pengingat Baru</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-gray-700 text-sm font-medium">
                    Isi Pesan
                  </label>
                  
                  <div className="flex items-center space-x-2">
                    {/* Auto-fill Button */}
                    {autoFillData && formData.message && (
                      <button
                        type="button"
                        onClick={handleAutoFillMessage}
                        className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-xs"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Auto-isi</span>
                      </button>
                    )}

                    {/* Template Dropdown */}
                    {templates.length > 0 && (
                    <div className="relative template-dropdown">
                      <button
                        type="button"
                        onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm"
                      >
                        <span>📝 Template</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isTemplateDropdownOpen && (
                        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="max-h-48 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTemplate('')
                                setFormData(prev => ({ ...prev, message: '' }))
                                setIsTemplateDropdownOpen(false)
                              }}
                              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                            >
                              ✨ Tulis sendiri
                            </button>
                            {/* Group templates by category */}
                            {['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'].map((category) => {
                              const categoryTemplates = templates.filter(t => t.category === category)
                              if (categoryTemplates.length === 0) return null
                              
                              const categoryLabels = {
                                REMINDER: '💊 Pengingat',
                                APPOINTMENT: '📅 Janji Temu', 
                                EDUCATIONAL: '📚 Edukasi'
                              }
                              
                              return (
                                <div key={category}>
                                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                                    {categoryLabels[category as keyof typeof categoryLabels]}
                                  </div>
                                  {categoryTemplates.map((template) => (
                                    <button
                                      key={template.id}
                                      type="button"
                                      onClick={() => handleTemplateSelect(template.id)}
                                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors cursor-pointer ${
                                        selectedTemplate === template.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                      }`}
                                    >
                                      <div className="font-medium">{template.templateName}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {template.templateText.substring(0, 50)}...
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
                
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={templates.length > 0 ? "Pilih template atau tulis pesan sendiri..." : "Tulis pesan pengingat..."}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  rows={4}
                  required
                />
                
                {/* Enhanced Auto-fill Data Preview */}
                {autoFillData && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Data Tersedia untuk Auto-isi</span>
                      </h4>
                      {!formData.message && (
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                          Tulis pesan dulu
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Patient Basic Info */}
                      {autoFillData.nama && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Nama Pasien</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.nama}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{nama}'}</div>
                        </div>
                      )}
                      
                      {autoFillData.nomor && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">No. WhatsApp</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.nomor}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{nomor}'}</div>
                        </div>
                      )}
                      
                      {/* Medical Info */}
                      {autoFillData.obat && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Nama Obat</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.obat}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{obat}'}</div>
                        </div>
                      )}
                      
                      {autoFillData.dosis && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Dosis</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.dosis}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{dosis}'}</div>
                        </div>
                      )}
                      
                      {autoFillData.dokter && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Nama Dokter</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.dokter}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{dokter}'}</div>
                        </div>
                      )}
                      
                      {autoFillData.rumahSakit && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Rumah Sakit</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.rumahSakit}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{rumahSakit}'}</div>
                        </div>
                      )}
                      
                      {/* Time & Volunteer Info */}
                      <div className="bg-white p-2 rounded-lg">
                        <div className="text-xs text-gray-500">Waktu</div>
                        <div className="text-sm font-medium text-gray-800">{formData.time}</div>
                        <div className="text-xs text-blue-600 mt-1">{'{waktu}'}</div>
                      </div>
                      
                      {autoFillData.volunteer && (
                        <div className="bg-white p-2 rounded-lg">
                          <div className="text-xs text-gray-500">Volunteer</div>
                          <div className="text-sm font-medium text-gray-800">{autoFillData.volunteer}</div>
                          <div className="text-xs text-blue-600 mt-1">{'{volunteer}'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Template Info */}
                {selectedTemplate && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700 font-medium">
                        📝 Template: {templates.find(t => t.id === selectedTemplate)?.templateName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplate('')
                          setFormData(prev => ({ ...prev, message: '' }))
                        }}
                        className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        ✕ Hapus template
                      </button>
                    </div>
                  </div>
                )}
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
                             const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
                             return dayNames[day]
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
            </form>
          )}
        </div>
        
        {/* Modal Footer */}
        {!loading && (
          <div className="flex space-x-4 p-6 border-t flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
            >
              ✕ Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>▶</span>
              <span>{submitting ? 'Loading...' : 'Submit'}</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Custom Recurrence Modal */}
      {isCustomRecurrenceOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Pengulangan Kustom</h3>
              <button
                onClick={() => setIsCustomRecurrenceOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
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