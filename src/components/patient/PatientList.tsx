'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Patient {
  id: string
  name: string
  phoneNumber: string
  complianceRate: number
  isActive: boolean
  assignedVolunteerId: string | null
}

interface PatientListProps {
  patients?: Patient[]
  loading?: boolean
  showFilters?: boolean
  showSearch?: boolean
  onPatientClick?: (patient: Patient) => void
}

export function PatientList({
  patients: externalPatients,
  loading: externalLoading,
  showFilters = true,
  showSearch = true,
  onPatientClick
}: PatientListProps) {
  const router = useRouter()
  const [internalPatients, setInternalPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [internalLoading, setInternalLoading] = useState(true)

  // Use external data if provided, otherwise fetch internally
  const patients = externalPatients || internalPatients
  const loading = externalLoading !== undefined ? externalLoading : internalLoading

  useEffect(() => {
    if (!externalPatients) {
      fetchPatients()
    } else {
      setInternalLoading(false)
    }
  }, [externalPatients])

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        setInternalPatients(data)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.phoneNumber.includes(searchTerm)

      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && patient.isActive) ||
                           (statusFilter === 'inactive' && !patient.isActive)

      const matchesCompliance = complianceFilter === 'all' ||
                               (complianceFilter === 'high' && patient.complianceRate >= 80) ||
                               (complianceFilter === 'medium' && patient.complianceRate >= 50 && patient.complianceRate < 80) ||
                               (complianceFilter === 'low' && patient.complianceRate < 50)

      return matchesSearch && matchesStatus && matchesCompliance
    })
  }, [patients, searchTerm, statusFilter, complianceFilter])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
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

  const getStatusLabel = (isActive: boolean) => {
    return isActive
      ? { text: 'Aktif', bg: 'bg-blue-100', color: 'text-blue-800' }
      : { text: 'Nonaktif', bg: 'bg-gray-100', color: 'text-gray-800' }
  }

  const handlePatientClick = (patient: Patient) => {
    if (onPatientClick) {
      onPatientClick(patient)
    } else {
      router.push(`/pasien/${patient.id}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                <div className="h-6 bg-gray-300 rounded-full w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
          >
            <option value="all">Semua Kepatuhan</option>
            <option value="high">Tinggi (≥80%)</option>
            <option value="medium">Sedang (50-79%)</option>
            <option value="low">Rendah (&lt;50%)</option>
          </select>
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-600">
        Menampilkan {filteredPatients.length} dari {patients.length} pasien
      </p>

      {/* Patient List */}
      <div className="space-y-3">
        {filteredPatients.map((patient) => {
          const complianceLabel = getComplianceLabel(patient.complianceRate)
          const statusLabel = getStatusLabel(patient.isActive)

          return (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${getComplianceColor(patient.complianceRate)} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {getInitials(patient.name)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                  <p className="text-sm text-gray-500">Kepatuhan: {patient.complianceRate}%</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`${statusLabel.bg} ${statusLabel.color} px-3 py-1 rounded-full text-sm font-medium`}>
                  {statusLabel.text}
                </span>
                <span className={`${complianceLabel.bg} ${complianceLabel.color} px-3 py-1 rounded-full text-sm font-medium`}>
                  {complianceLabel.text}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Tidak ada pasien yang sesuai dengan filter</p>
        </div>
      )}
    </div>
  )
}

