'use client'

import { useRouter } from 'next/navigation'
import { Bell, FileText, Play, Plus } from 'lucide-react'
import { useCallback, memo, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import AddPatientDialog from '@/components/AddPatientDialog'

interface Patient {
  id: string
  name: string
  complianceRate: number
  isActive: boolean
}

function DashboardClient() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchQuery, activeFilter])

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        setPatients(data)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    if (searchQuery.trim()) {
      filtered = filtered.filter(patient => 
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (activeFilter === 'active') {
      filtered = filtered.filter(patient => patient.isActive)
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(patient => !patient.isActive)
    }

    setFilteredPatients(filtered)
  }

  const handlePengingatClick = useCallback(() => {
    router.push('/dashboard/pengingat')
  }, [router])

  const handleBeritaClick = useCallback(() => {
    router.push('/dashboard/berita')
  }, [router])

  const handleVideoClick = useCallback(() => {
    router.push('/dashboard/video')
  }, [router])

  const handleAddPatientClick = useCallback(() => {
    setShowAddPatientModal(true)
  }, [])

  const handleAddPatientSuccess = useCallback(() => {
    fetchPatients()
  }, [])

  const handlePatientClick = useCallback((patientId: string) => {
    router.push(`/dashboard/pasien/${patientId}`)
  }, [router])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getComplianceLabel = (rate: number) => {
    if (rate >= 80) return { text: 'Tinggi', bg: 'bg-green-100', color: 'text-green-800' }
    if (rate >= 50) return { text: 'Sedang', bg: 'bg-yellow-100', color: 'text-yellow-800' }
    return { text: 'Rendah', bg: 'bg-red-100', color: 'text-red-800' }
  }

  return (
    <>
      {/* Blue Background Section */}
      <div className="bg-blue-500 p-6 mb-6" style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem' }}>
        <div className="grid grid-cols-3 gap-4">
          {/* Pengingat Card */}
          <div 
            onClick={handlePengingatClick}
            className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-sm text-gray-900">Pengingat</h3>
          </div>

          {/* Berita Card */}
          <div 
            onClick={handleBeritaClick}
            className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-sm text-gray-900">Berita</h3>
          </div>

          {/* Video Edukasi Card */}
          <div 
            onClick={handleVideoClick}
            className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Play className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-sm text-gray-900">Video Edukasi</h3>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="bg-blue-100 border-2 border-blue-500 text-blue-600 rounded-full px-6 py-3 text-center mb-6">
        <span className="font-medium">
          {loading ? 'Loading...' : `${filteredPatients.length} pasien dalam pengawasan`}
        </span>
      </div>

      {/* Daftar Pasien Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Daftar Pasien</h2>
          <div className="flex items-center space-x-3">
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
            {/* Add Patient Button */}
            <div 
              onClick={handleAddPatientClick}
              className="bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'active' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'inactive' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Nonaktif
          </button>
        </div>

        {/* Patient List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.slice(0, 8).map((patient) => {
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
                    <div className={`w-12 h-12 ${getComplianceColor(patient.complianceRate)} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {getInitials(patient.name)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">{patient.name}</h3>
                      <p className="text-sm text-gray-500">Kepatuhan: {patient.complianceRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`${statusLabel.bg} ${statusLabel.color} px-3 py-1 rounded-full text-xs font-medium`}>
                      {statusLabel.text}
                    </span>
                    <span className={`${complianceLabel.bg} ${complianceLabel.color} px-3 py-1 rounded-full text-xs font-medium`}>
                      {complianceLabel.text}
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredPatients.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {patients.length === 0 ? 'Belum ada pasien' : 'Tidak ada pasien yang cocok dengan pencarian'}
                </p>
                {patients.length === 0 && (
                  <button
                    onClick={handleAddPatientClick}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Tambah Pasien Pertama
                  </button>
                )}
              </div>
            )}

            {filteredPatients.length > 8 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => router.push('/dashboard/pasien')}
                  className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Lihat Semua Pasien ({filteredPatients.length})
                </button>
              </div>
            )}

            {/* Quick Test Access - Development only */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-center pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={() => router.push('/dashboard/test-whatsapp')}
                  className="text-green-600 hover:text-green-800 font-medium cursor-pointer text-sm"
                >
                  🧪 Test WhatsApp API
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Patient Dialog */}
      <AddPatientDialog
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onSuccess={handleAddPatientSuccess}
      />
    </>
  )
}

export default memo(DashboardClient)