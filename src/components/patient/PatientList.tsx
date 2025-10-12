'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { VirtualPatientList } from '@/components/ui/virtual-list'
import { logger } from '@/lib/logger';

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
  enableVirtualScrolling?: boolean
  virtualScrollHeight?: number
}

// Memoized PatientCard component to prevent unnecessary re-renders
interface PatientCardProps {
  patient: Patient
  onPatientClick: (patient: Patient) => void
  getInitials: (name: string) => string
  getComplianceColor: (rate: number) => string
  getComplianceLabel: (rate: number) => { text: string; bg: string; color: string }
  getStatusLabel: (isActive: boolean) => { text: string; bg: string; color: string }
}

const PatientCard = memo<PatientCardProps>(({ 
  patient, 
  onPatientClick, 
  getInitials, 
  getComplianceColor, 
  getComplianceLabel, 
  getStatusLabel 
}) => {
  const handleClick = useCallback(() => {
    onPatientClick(patient)
  }, [patient, onPatientClick])

  const complianceLabel = useMemo(() => getComplianceLabel(patient.complianceRate), [patient.complianceRate, getComplianceLabel])
  const statusLabel = useMemo(() => getStatusLabel(patient.isActive), [patient.isActive, getStatusLabel])
  const initials = useMemo(() => getInitials(patient.name), [patient.name, getInitials])
  const complianceColor = useMemo(() => getComplianceColor(patient.complianceRate), [patient.complianceRate, getComplianceColor])

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 ${complianceColor} rounded-full flex items-center justify-center`}>
          <span className="text-white font-bold text-lg">
            {initials}
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
})

PatientCard.displayName = 'PatientCard'

function PatientList({
  patients: externalPatients,
  loading: externalLoading,
  showFilters = true,
  showSearch = true,
  onPatientClick,
  enableVirtualScrolling = false,
  virtualScrollHeight = 500
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
        const result = await response.json()
        const data = result.data || result
        setInternalPatients(data)
      }
    } catch (error: unknown) {
      logger.error('Error fetching patients:', error instanceof Error ? error : new Error(String(error)))
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

  // Memoized utility functions to prevent recreating on every render
  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }, [])

  const getComplianceColor = useCallback((rate: number) => {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }, [])

  const getComplianceLabel = useCallback((rate: number) => {
    if (rate >= 80) return { text: 'Tinggi', bg: 'bg-green-100', color: 'text-green-800' }
    if (rate >= 50) return { text: 'Sedang', bg: 'bg-yellow-100', color: 'text-yellow-800' }
    return { text: 'Rendah', bg: 'bg-red-100', color: 'text-red-800' }
  }, [])

  const getStatusLabel = useCallback((isActive: boolean) => {
    return isActive
      ? { text: 'Aktif', bg: 'bg-blue-100', color: 'text-blue-800' }
      : { text: 'Nonaktif', bg: 'bg-gray-100', color: 'text-gray-800' }
  }, [])

  const handlePatientClick = useCallback((patient: Patient) => {
    if (onPatientClick) {
      onPatientClick(patient)
    } else {
      router.push(`/pasien/${patient.id}`)
    }
  }, [onPatientClick, router])

  if (loading) {
    return null;
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
      {enableVirtualScrolling && filteredPatients.length > 20 ? (
        <VirtualPatientList
          patients={filteredPatients}
          containerHeight={virtualScrollHeight}
          itemHeight={100} // Height of PatientCard
          loading={loading}
          keyExtractor={(patient) => patient.id}
          renderPatient={(patient) => (
            <div className="px-1 pb-3">
              <PatientCard
                patient={patient}
                onPatientClick={handlePatientClick}
                getInitials={getInitials}
                getComplianceColor={getComplianceColor}
                getComplianceLabel={getComplianceLabel}
                getStatusLabel={getStatusLabel}
              />
            </div>
          )}
        />
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onPatientClick={handlePatientClick}
              getInitials={getInitials}
              getComplianceColor={getComplianceColor}
              getComplianceLabel={getComplianceLabel}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </div>
      )}

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Tidak ada pasien yang sesuai dengan filter</p>
        </div>
      )}
    </div>
  )
}

// Export memoized PatientList to prevent unnecessary re-renders
export default memo(PatientList)

// Also export named export for backward compatibility
export { PatientList }

