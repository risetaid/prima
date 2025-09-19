'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import { Header } from '@/components/ui/header'
import { MobileHeader } from '@/components/ui/mobile-header'
import { ReminderPageSkeleton } from '@/components/ui/dashboard-skeleton'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import AddPatientDialog from '@/components/dashboard/add-patient-dialog'

interface Patient {
  id: string
  name: string
  complianceRate: number
  isActive: boolean
  photoUrl?: string
  phoneNumber?: string
}

export default function PatientPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)

  const filteredPatients = (() => {
    let filtered = patients
    if (searchQuery) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (activeFilters.includes('active') && !activeFilters.includes('inactive')) {
      filtered = filtered.filter(patient => patient.isActive)
    } else if (activeFilters.includes('inactive') && !activeFilters.includes('active')) {
      filtered = filtered.filter(patient => !patient.isActive)
    }
    return filtered
  })()

  const fetchPatients = useCallback(async () => {
    try {
      // Use optimized dashboard overview endpoint
      const response = await fetch('/api/dashboard/overview')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients)
      } else {
        // Fallback to original endpoint if new one fails
        logger.warn('Failed to fetch dashboard overview, falling back to patients endpoint')
        const fallbackResponse = await fetch('/api/patients')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setPatients(data)
        }
      }
    } catch (error) {
      logger.error('Error fetching patients', error as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPatients()
  }, [fetchPatients])

  const handleAddPatientSuccess = () => {
    setLoading(true)
    setShowAddPatientModal(false)
    void fetchPatients()
  }

  const toggleFilter = (filterType: string) => {
    setActiveFilters((prev) => {
      if (prev.includes(filterType)) {
        // Remove filter if already active
        return prev.filter((f) => f !== filterType)
      } else {
        // Add filter if not active
        return [...prev, filterType]
      }
    })
  }

  const handlePatientClick = (patientId: string) => {
    router.push(`/pasien/${patientId}`)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500",
      "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-lime-500",
      "bg-orange-500", "bg-rose-500", "bg-violet-500", "bg-sky-500"
    ];
    // Use name hash to ensure consistent color per person
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  const getComplianceLabel = (rate: number) => {
    if (rate >= 80) return { text: 'Tinggi', bg: 'bg-green-100', color: 'text-green-800' }
    if (rate >= 50) return { text: 'Sedang', bg: 'bg-yellow-100', color: 'text-yellow-800' }
    return { text: 'Rendah', bg: 'bg-red-100', color: 'text-red-800' }
  }

  if (loading) {
    return <ReminderPageSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
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
        <MobileHeader showNavigation={true} />
      </div>

      {/* Desktop: Header Section with Dashboard Style */}
      <div className="hidden lg:block relative z-10">
        <div className="bg-blue-600 text-white py-6">
          <div className="px-8">
            <div className="flex items-center justify-between">
              {/* Left: Search Bar */}
              <div className="relative bg-white rounded-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari Pasien"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-80 text-gray-900"
                />
              </div>

              {/* Center: Patient Count */}
              <div className="flex items-center space-x-4">
                <h1 className="text-white text-3xl font-bold">
                  {loading ? "Loading..." : `${filteredPatients.length} Pasien Dalam Pengawasan`}
                </h1>
                <button
                  onClick={() => setShowAddPatientModal(true)}
                  className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Right: Filter Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => toggleFilter('active')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilters.includes('active')
                      ? 'bg-white text-blue-500 shadow-md'
                      : 'bg-blue-400 text-white hover:bg-blue-300'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => toggleFilter('inactive')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilters.includes('inactive')
                      ? 'bg-white text-blue-500 shadow-md'
                      : 'bg-blue-400 text-white hover:bg-blue-300'
                  }`}
                >
                  Nonaktif
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Patient Table */}
        <div className="px-4 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Table Header */}
            <div className="bg-blue-600 text-white">
              <div className="grid grid-cols-6 px-6 py-4 font-medium text-center">
                <div>Profil</div>
                <div>Nama</div>
                <div>Status</div>
                <div>Kepatuhan</div>
                <div>Nomor WhatsApp</div>
                <div>Detail Pasien</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {filteredPatients.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 text-lg">
                    Belum ada pasien dalam pengawasan
                  </p>
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const complianceLabel = getComplianceLabel(patient.complianceRate)
                   const statusLabel = patient.isActive
                     ? { text: "Aktif", bg: "bg-blue-500", color: "text-white" }
                     : { text: "Nonaktif", bg: "bg-gray-400", color: "text-white" }

                  return (
                    <div
                      key={patient.id}
                      className="grid grid-cols-6 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                    >
                      {/* Profile Photo */}
                      <div className="flex justify-center">
                        {patient.photoUrl ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                            <Image
                              src={patient.photoUrl}
                              alt={patient.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRandomAvatarColor(patient.name)}`}>
                            <span className="text-white font-semibold text-lg">
                              {getInitials(patient.name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="text-center">
                        <p className="font-medium text-gray-900 truncate">
                          {patient.name}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="text-center">
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusLabel.bg} ${statusLabel.color}`}>
                           {statusLabel.text}
                         </span>
                      </div>

                      {/* Compliance */}
                      <div className="flex items-center justify-center">
                        <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-l-lg text-sm font-bold">
                          {patient.complianceRate}%
                        </div>
                         <span className={`${complianceLabel.bg} ${complianceLabel.color} px-4 py-2 rounded-r-lg text-sm font-bold`}>
                           {complianceLabel.text}
                         </span>
                      </div>

                      {/* Phone Number */}
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {patient.phoneNumber}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handlePatientClick(patient.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          Lihat Detail
                          <br />
                          Pasien
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden relative z-10">
        <main className="px-4 py-8">
          {/* Mobile: Title and Controls */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Pasien Dalam Pengawasan</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddPatientModal(true)}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="cari"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Mobile: Filter Buttons */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={() => toggleFilter('active')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilters.includes('active')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => toggleFilter('inactive')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilters.includes('inactive')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Nonaktif
            </button>
          </div>

          <div className="space-y-3">
            {filteredPatients.map((patient) => {
              const complianceLabel = getComplianceLabel(patient.complianceRate)
              const statusLabel = patient.isActive
                ? { text: 'Aktif', bg: 'bg-blue-500', color: 'text-white' }
                : { text: 'Nonaktif', bg: 'bg-gray-500', color: 'text-white' }

              return (
                <div
                  key={patient.id}
                  onClick={() => handlePatientClick(patient.id)}
                  className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    {patient.photoUrl ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                        <Image
                          src={patient.photoUrl}
                          alt={patient.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 ${getRandomAvatarColor(patient.name)} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">
                          {getInitials(patient.name)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">{patient.name}</h3>
                      <p className="text-sm text-gray-500">Kepatuhan: {patient.complianceRate}%</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`${statusLabel.bg} ${statusLabel.color} px-3 py-1 rounded-full text-xs font-medium min-w-[60px] text-center`}>
                      {statusLabel.text}
                    </span>
                    <span className={`${complianceLabel.bg} ${complianceLabel.color} px-3 py-1 rounded-full text-xs font-medium min-w-[60px] text-center`}>
                      {complianceLabel.text}
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredPatients.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {patients.length === 0 ? 'Belum ada pasien' : 'Tidak ada pasien yang sesuai dengan filter'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <AddPatientDialog
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onSuccess={handleAddPatientSuccess}
      />
    </div>
  )
}

