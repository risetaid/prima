'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'

interface Patient {
  id: string
  name: string
  phoneNumber: string
  complianceRate: number
  isActive: boolean
  assignedVolunteerId?: string
}

export default function PatientListPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
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
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto">
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

        {/* Results Count */}
        <p className="text-sm text-gray-600 mb-4">
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
                onClick={() => router.push(`/dashboard/pasien/${patient.id}`)}
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
      </main>
    </div>
  )
}