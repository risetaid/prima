'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function StatistikPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  if (!isLoaded) return <div>Loading...</div>
  if (!user) redirect('/sign-in')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="mr-3"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Statistik</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Pasien</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Kepatuhan Rata-rata</p>
                <p className="text-2xl font-bold text-gray-900">78%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tren Mingguan</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Minggu ini</span>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">+5%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '82%' }}></div>
            </div>
            <p className="text-xs text-gray-500">82% kepatuhan minggu ini</p>
          </div>
        </div>

        {/* Patient Statistics */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Statistik Per Pasien</h2>
          <div className="space-y-4">
            {/* Maria Indriani */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MI</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Maria Indriani</h3>
                  <p className="text-xs text-gray-500">7 hari terakhir</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-green-600">95%</span>
              </div>
            </div>

            {/* Siti Hartini */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SH</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Siti Hartini</h3>
                  <p className="text-xs text-gray-500">7 hari terakhir</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-600">75%</span>
              </div>
            </div>

            {/* Yani Susanti */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">YS</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Yani Susanti</h3>
                  <p className="text-xs text-gray-500">7 hari terakhir</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-600">45%</span>
              </div>
            </div>

            {/* Agus Setiawan */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AS</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Agus Setiawan</h3>
                  <p className="text-xs text-gray-500">7 hari terakhir</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-green-600">100%</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}