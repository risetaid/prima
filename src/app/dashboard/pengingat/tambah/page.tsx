'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function AddReminderPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    messageContent: 'Minum obat candesartan',
    interval: 'Harian',
    timeOfDay: '12.00',
    startDate: '17/08/2025',
    totalReminders: '5'
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      router.back()
    }, 1000)
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="space-y-6">
          {/* Message Content */}
          <div>
            <label className="block text-gray-600 text-base mb-2">Isi Pesan</label>
            <input
              type="text"
              value={formData.messageContent}
              onChange={(e) => handleInputChange('messageContent', e.target.value)}
              className="w-full px-4 py-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
          </div>

          {/* Interval */}
          <div>
            <label className="block text-gray-600 text-base mb-2">Interval Pengingat</label>
            <div className="relative">
              <select
                value={formData.interval}
                onChange={(e) => handleInputChange('interval', e.target.value)}
                className="w-full px-4 py-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10 text-lg"
              >
                <option value="Harian">Harian</option>
                <option value="Mingguan">Mingguan</option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-gray-600 text-base mb-2">Jam Pengingat</label>
            <div className="relative">
              <input
                type="text"
                value={formData.timeOfDay}
                onChange={(e) => handleInputChange('timeOfDay', e.target.value)}
                className="w-full px-4 py-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="12.00"
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-blue-500 pointer-events-none" />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-gray-600 text-base mb-2">Tanggal Mulai</label>
            <div className="relative">
              <input
                type="text"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-4 py-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="17/08/2025"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-blue-500 pointer-events-none" />
            </div>
          </div>

          {/* Total Reminders */}
          <div>
            <label className="block text-gray-600 text-base mb-2">Jumlah Pengingat</label>
            <input
              type="text"
              value={formData.totalReminders}
              onChange={(e) => handleInputChange('totalReminders', e.target.value)}
              className="w-full px-4 py-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="5"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-12">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 bg-gray-300 text-gray-700 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-red-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Submit'}
          </button>
        </div>
      </main>
    </div>
  )
}