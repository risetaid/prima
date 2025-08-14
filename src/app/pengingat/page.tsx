'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/ui/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Phone } from 'lucide-react'

export default function PengingatPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  // If not authenticated, show sign-in prompt instead of redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Akses Terbatas</h1>
              <p className="text-gray-600 mb-6">
                Anda perlu masuk untuk mengakses halaman pengingat pasien.
              </p>
              <button
                onClick={() => router.push('/sign-in')}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
              >
                Masuk Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [patients] = useState([
    {
      id: 1,
      name: "Maria Indriani",
      initials: "MI",
      compliance: 95,
      condition: "Tinggi",
      phone: "087863071881",
      color: "bg-green-500"
    },
    {
      id: 2,
      name: "Siti Hartini", 
      initials: "SH",
      compliance: 75,
      condition: "Sedang",
      phone: "087863071881",
      color: "bg-yellow-500"
    },
    {
      id: 3,
      name: "Yani Susanti",
      initials: "YS", 
      compliance: 45,
      condition: "Rendah",
      phone: "087863071881",
      color: "bg-red-500"
    }
  ])

  const getConditionStyle = (condition: string) => {
    switch (condition) {
      case 'Tinggi':
        return 'bg-green-100 text-green-800'
      case 'Sedang':
        return 'bg-orange-100 text-orange-800'
      case 'Rendah':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePatientClick = (patientName: string) => {
    const patientSlug = patientName.toLowerCase().replace(' ', '-')
    router.push(`/pengingat/${patientSlug}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Navigation />
      
      {/* Same decorative background as landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hidden lg:block">
          <div className="absolute top-32 left-8 w-24 h-32 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-60 transform rotate-45"></div>
          <div className="absolute top-64 left-16 w-16 h-20 bg-blue-300 rounded-full opacity-40 transform -rotate-12"></div>
          <div className="absolute top-40 right-12 w-28 h-36 bg-gradient-to-l from-blue-400 to-blue-500 rounded-full opacity-50 transform -rotate-45"></div>
          <div className="absolute bottom-32 right-8 w-20 h-24 bg-blue-300 rounded-full opacity-40 transform rotate-12"></div>
        </div>
        <div className="hidden md:block">
          <div className="absolute top-20 left-1/4 w-8 h-8 bg-teal-400 rounded-full opacity-60"></div>
          <div className="absolute top-16 right-1/3 w-6 h-6 bg-blue-300 rounded-full opacity-50"></div>
          <div className="absolute bottom-24 left-1/3 w-10 h-10 bg-blue-200 rounded-full opacity-40"></div>
          <div className="absolute bottom-16 right-1/4 w-7 h-7 bg-teal-300 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Mobile/Tablet View */}
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Daftar Pasien</h1>
            
            <div className="space-y-4">
              {patients.map((patient) => (
                <Card key={patient.id} className="bg-white shadow-sm" onClick={() => handlePatientClick(patient.name)}>
                  <CardContent className="p-6 cursor-pointer">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 ${patient.color} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                        {patient.initials}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">{patient.compliance}%</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle(patient.condition)}`}>
                            {patient.condition}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{patient.phone}</p>
                      </div>
                      
                      {/* Action Button */}
                      <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                        Detail
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Desktop View - Table */}
          <div className="hidden lg:block">
            <Card className="bg-white shadow-sm">
              {/* Table Header */}
              <div className="bg-blue-500 text-white px-8 py-4 rounded-t-lg">
                <div className="grid grid-cols-5 gap-6 items-center">
                  <div className="font-semibold">Profil</div>
                  <div className="font-semibold">Nama</div>
                  <div className="font-semibold">Kepatuhan</div>
                  <div className="font-semibold">Nomor Telepon</div>
                  <div className="font-semibold">Detail Pengingat</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <div key={patient.id} className="px-8 py-6 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-5 gap-6 items-center">
                      
                      {/* Profile Avatar */}
                      <div className={`w-16 h-16 ${patient.color} rounded-full flex items-center justify-center text-white font-bold text-xl`}>
                        {patient.initials}
                      </div>

                      {/* Name */}
                      <div className="font-semibold text-gray-900 text-lg">
                        {patient.name}
                      </div>

                      {/* Compliance */}
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-gray-900">{patient.compliance}%</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionStyle(patient.condition)}`}>
                          {patient.condition}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Phone className="w-4 h-4" />
                        <span>{patient.phone}</span>
                      </div>

                      {/* Action Button */}
                      <div>
                        <button 
                          onClick={() => handlePatientClick(patient.name)}
                          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Lihat Detail Pengingat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}