'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, Download, CheckSquare, MessageSquare, X, Clock } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Header } from '@/components/ui/header'
import { PatientReminderDashboard } from '@/components/pengingat/patient-reminder-dashboard'



interface ReminderStats {
  terjadwal: number
  perluDiperbarui: number
  selesai: number
  semua: number
}

export default function PatientReminderPage() {
  const router = useRouter()
  const params = useParams()
  const [stats, setStats] = useState<ReminderStats>({
    terjadwal: 0,
    perluDiperbarui: 0,
    selesai: 0,
    semua: 0
  })
  const [loading, setLoading] = useState(true)
  const [patientName, setPatientName] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchReminderStats(params.id as string)
      fetchPatientName(params.id as string)
    }
  }, [params.id])

  const fetchReminderStats = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/reminders/stats`)
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      } else {
        // Fallback to empty stats if API fails
        setStats({
          terjadwal: 0,
          perluDiperbarui: 0,
          selesai: 0,
          semua: 0
        })
      }
    } catch (error) {
      console.error('Error fetching reminder stats:', error)
      setStats({
        terjadwal: 0,
        perluDiperbarui: 0,
        selesai: 0,
        semua: 0
      })
    }
  }

  const fetchPatientName = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`)
      if (response.ok) {
        const patient = await response.json()
        setPatientName(patient.name)
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddReminder = () => {
    setIsAddModalOpen(true)
  }

  const handleModalSuccess = async () => {
    // Refresh stats after successful reminder creation
    if (params.id) {
      await fetchReminderStats(params.id as string)
    }
  }

  const handleStatusClick = (status: string) => {
    router.push(`/dashboard/pengingat/pasien/${params.id}/${status}`)
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
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Desktop: Header */}
      <div className="hidden lg:block relative z-10">
        <Header showNavigation={true} />
      </div>

      {/* Mobile: Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white">
          <div className="flex justify-between items-center px-4 py-4">
            <button 
              onClick={() => router.back()}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
      </div>

      {/* Desktop: 3-Column Layout */}
      <div className="hidden lg:block py-8 relative z-10">
        <PatientReminderDashboard patientName={patientName} />
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden relative z-10">
        <main className="px-4 py-6">
          {/* Patient Name */}
          {patientName && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pengingat untuk {patientName}</h2>
            </div>
          )}

          {/* Add New Reminder Button */}
          <button
            onClick={handleAddReminder}
            className="w-full bg-blue-500 text-white py-4 px-6 rounded-full font-semibold flex items-center justify-center space-x-2 mb-8 hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Pengingat Baru</span>
          </button>

          {/* Add Reminder Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tambah Pengingat Baru
                  </h3>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="overflow-y-auto flex-1 p-6">
                  <form className="space-y-6">
                    {/* Patient Info */}
                    {patientName && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-700">
                          <strong>Pasien:</strong> {patientName}
                        </p>
                      </div>
                    )}

                    {/* Message Field */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Isi Pesan
                      </label>
                      <textarea
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
                          defaultValue="08:00"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="flex space-x-4 p-6 border-t">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status Cards Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Terjadwal */}
            <div 
              onClick={() => handleStatusClick('terjadwal')}
              className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative border-2 border-blue-200"
            >
              <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                {stats.terjadwal}
              </div>
              <div className="bg-blue-500 p-3 rounded-2xl mb-3 inline-block">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Terjadwal</h3>
            </div>

            {/* Perlu Diperbarui */}
            <div 
              onClick={() => handleStatusClick('perlu-diperbarui')}
              className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative border-2 border-blue-200"
            >
              <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                {stats.perluDiperbarui}
              </div>
              <div className="bg-blue-500 p-3 rounded-2xl mb-3 inline-block">
                <Download className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Perlu Diperbarui</h3>
            </div>

            {/* Selesai */}
            <div 
              onClick={() => handleStatusClick('selesai')}
              className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative border-2 border-blue-200"
            >
              <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                {stats.selesai}
              </div>
              <div className="bg-blue-500 p-3 rounded-2xl mb-3 inline-block">
                <CheckSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Selesai</h3>
            </div>

            {/* Semua */}
            <div 
              onClick={() => handleStatusClick('semua')}
              className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative border-2 border-blue-200"
            >
              <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                {stats.semua}
              </div>
              <div className="bg-blue-500 p-3 rounded-2xl mb-3 inline-block">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Semua</h3>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Statistik Kepatuhan</h3>
            <div className="bg-blue-500 rounded-2xl p-6 flex items-end justify-center space-x-2">
              <div className="bg-white/40 rounded-md h-12 w-6"></div>
              <div className="bg-white/70 rounded-md h-20 w-6"></div>
              <div className="bg-white/50 rounded-md h-16 w-6"></div>
              <div className="bg-white/30 rounded-md h-10 w-6"></div>
              <div className="bg-white/80 rounded-md h-24 w-6"></div>
              <div className="bg-white/50 rounded-md h-14 w-6"></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}