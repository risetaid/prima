'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { UserMenu } from '@/components/ui/user-menu'

interface Patient {
  id: string
  name: string
  complianceRate: number
  isActive: boolean
}

export default function ReminderPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        
        // Calculate real-time compliance rate for each patient
        const patientsWithRealTimeCompliance = await Promise.all(
          data.map(async (patient: Patient) => {
            try {
              const completedResponse = await fetch(`/api/patients/${patient.id}/reminders/completed`)
              if (completedResponse.ok) {
                const completedReminders = await completedResponse.json()
                const totalReminders = completedReminders.length
                const completedCount = completedReminders.filter((r: any) => r.medicationTaken).length
                const realTimeComplianceRate = totalReminders > 0 
                  ? Math.round((completedCount / totalReminders) * 100)
                  : 0
                
                return {
                  ...patient,
                  complianceRate: realTimeComplianceRate
                }
              }
              return patient // Fallback to original data if API fails
            } catch (error) {
              console.error(`Error fetching compliance for patient ${patient.id}:`, error)
              return patient // Fallback to original data if API fails
            }
          })
        )
        
        setPatients(patientsWithRealTimeCompliance)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
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
        {/* Patient List */}
        <div className="space-y-3">
          {patients.map((patient) => {
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
                  <div className={`w-12 h-12 ${getRandomAvatarColor(patient.name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">
                      {getInitials(patient.name)}
                    </span>
                  </div>
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

          {patients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada pasien</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}