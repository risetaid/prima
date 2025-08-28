'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'
import { DesktopHeader } from '@/components/ui/desktop-header'
import { PatientReminderTable } from '@/components/ui/patient-reminder-table'
import Image from 'next/image'

interface Patient {
  id: string
  name: string
  complianceRate: number
  isActive: boolean
  photoUrl?: string
  phoneNumber?: string
}

export default function ReminderPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchQuery, activeFilters])

  const fetchPatients = async () => {
    try {
      // Use optimized dashboard overview endpoint
      const response = await fetch('/api/dashboard/overview')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients)
      } else {
        // Fallback to original endpoint if new one fails
        console.warn('Failed to fetch dashboard overview, falling back to patients endpoint')
        const fallbackResponse = await fetch('/api/patients')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setPatients(data)
        }
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
      filtered = filtered.filter((patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply multiple status filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter((patient) => {
        const isActive = patient.isActive
        return (
          (activeFilters.includes('active') && isActive) ||
          (activeFilters.includes('inactive') && !isActive)
        )
      })
    }

    setFilteredPatients(filtered)
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
    router.push(`/dashboard/pengingat/pasien/${patientId}`)
  }

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

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500",
      "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-lime-500",
      "bg-orange-500", "bg-rose-500", "bg-violet-500", "bg-sky-500"
    ];
    // Use name hash to ensure consistent color per person
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
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
    <div className="min-h-screen bg-gray-50">
      {/* Desktop: Header */}
      <div className="hidden lg:block">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Mobile: Header */}
      <div className="lg:hidden">
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
      </div>

      {/* Desktop: Main Content */}
      <div className="hidden lg:block py-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Manajemen Pengingat Pasien
                </h1>
                <p className="text-gray-600">
                  {loading ? "Loading..." : `${filteredPatients.length} pasien tersedia untuk dikelola pengingat obatnya`}
                </p>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex items-center space-x-4 mb-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari pasien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleFilter('active')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilters.includes('active')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => toggleFilter('inactive')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilters.includes('inactive')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Nonaktif
                </button>
              </div>
            </div>
          </div>
          
          <PatientReminderTable patients={filteredPatients} loading={loading} />
        </div>
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden">
        <main className="px-4 py-6">
          {/* Mobile: Title and Controls */}
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
            </div>
          </div>

          {/* Mobile: Filter Buttons */}
          <div className="flex space-x-2 mb-4">
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
    </div>
  )
}