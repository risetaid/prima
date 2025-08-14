'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Navigation } from '@/components/ui/navigation'

export default function LandingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  // Remove automatic redirect - let users see the landing page

  const handleSignIn = () => {
    router.push('/sign-in')
  }

  if (!isLoaded) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation Header */}
      <Navigation />

      {/* Decorative Background Elements - Desktop Only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blue Ribbon Elements */}
        <div className="hidden lg:block">
          {/* Left side ribbon */}
          <div className="absolute top-32 left-8 w-24 h-32 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-60 transform rotate-45"></div>
          <div className="absolute top-64 left-16 w-16 h-20 bg-blue-300 rounded-full opacity-40 transform -rotate-12"></div>
          
          {/* Right side ribbon */}
          <div className="absolute top-40 right-12 w-28 h-36 bg-gradient-to-l from-blue-400 to-blue-500 rounded-full opacity-50 transform -rotate-45"></div>
          <div className="absolute bottom-32 right-8 w-20 h-24 bg-blue-300 rounded-full opacity-40 transform rotate-12"></div>
        </div>

        {/* Flower/Star Elements */}
        <div className="hidden md:block">
          {/* Top decorative elements */}
          <div className="absolute top-20 left-1/4 w-8 h-8 bg-teal-400 rounded-full opacity-60"></div>
          <div className="absolute top-16 right-1/3 w-6 h-6 bg-blue-300 rounded-full opacity-50"></div>
          
          {/* Bottom decorative elements */}
          <div className="absolute bottom-24 left-1/3 w-10 h-10 bg-blue-200 rounded-full opacity-40"></div>
          <div className="absolute bottom-16 right-1/4 w-7 h-7 bg-teal-300 rounded-full opacity-50"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between min-h-[600px]">
            
            {/* Mobile/Tablet Content - Centered */}
            <div className="lg:hidden text-center max-w-md mx-auto">
              {/* Mobile Sign In Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Selamat Datang di PRIMA!
                  </h1>
                  <p className="text-gray-600">
                    Sistem monitoring terpadu untuk perawatan paliatif
                  </p>
                </div>
                
                <button
                  onClick={user ? () => router.push('/dashboard') : handleSignIn}
                  className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center space-x-3"
                >
                  <span>{user ? '📊' : '🚀'}</span>
                  <span>{user ? 'Masuk ke Dashboard' : 'Masuk atau Daftar dengan Google'}</span>
                </button>
              </div>
            </div>

            {/* Desktop Content - Split Layout */}
            <div className="hidden lg:flex lg:items-center lg:justify-between w-full">
              
              {/* Left Side - Hero Text */}
              <div className="lg:w-1/2 lg:pr-12">
                <h1 className="text-5xl xl:text-6xl font-bold text-blue-600 mb-6 leading-tight">
                  Palliative Remote Integrated Monitoring and Assistance
                </h1>
                
                <p className="text-lg xl:text-xl text-gray-700 mb-8 leading-relaxed max-w-2xl">
                  PRIMA merupakan inovasi sistem monitoring terpadu berbasis Android yang didesain khusus untuk meningkatkan efektivitas pendampingan pasien kanker payudara oleh relawan paliatif. PRIMA mengintegrasikan berbagai fitur yang saling terkoneksi untuk mendukung kepatuhan terapi dan monitoring pasien secara komprehensif, antara lain: integrasi pengingat obat, monitoring gejala, edukasi pasien, dan komunikasi dalam satu platform terpadu.
                </p>

                {/* CTA Button - Desktop */}
                <button
                  onClick={user ? () => router.push('/dashboard') : handleSignIn}
                  className="bg-blue-500 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {user ? 'Dashboard →' : 'Mulai Sekarang →'}
                </button>
              </div>

              {/* Right Side - Visual Elements */}
              <div className="lg:w-1/2 lg:pl-12 relative">
                <div className="relative z-10">
                  {/* Main decorative element */}
                  <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full opacity-30 mx-auto"></div>
                  
                  {/* PRIMA Logo overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-8xl font-bold text-blue-600 mb-4">PRIMA</div>
                      <div className="text-lg text-blue-500 font-medium">Healthcare Innovation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
