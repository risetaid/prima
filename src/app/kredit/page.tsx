'use client'

import { ArrowLeft, Info } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Header } from '@/components/ui/header'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function KreditPage() {
  const router = useRouter()

  return (
    <div>
      {/* Desktop: Header */}
      <div className="hidden lg:block">
        <Header showNavigation={true} />
      </div>

      {/* Mobile: Header */}
      <div className="lg:hidden">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-5">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
            <UserButton />
          </div>
        </header>
      </div>

      {/* Content - Basic HTML Structure */}
      <main className="min-h-screen bg-gray-50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.webp)",
            }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
          {/* Tentang Prima Section */}
          <section className="mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-full">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-center">Tentang Prima</h1>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl">
              <p className="text-sm leading-relaxed text-justify">
                Aplikasi ini dibuat untuk membantu relawan dalam mendampingi pasien kanker payudara. Melalui fitur pencatatan pasien dan sistem pengingat otomatis, relawan dapat mengatur jadwal minum obat maupun jadwal kontrol pasien. Notifikasi dikirimkan langsung melalui WhatsApp, sehingga pasien tetap terpantau dan tidak melewatkan perawatan penting.
              </p>
            </div>
          </section>

          {/* Pengembang Section */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 text-center">Pengembang</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image
                      src="/david.webp"
                      alt="David Yusaku Setiyono"
                      width={60}
                      height={60}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">David Yusaku Setiyono</h3>
                    <p className="text-sm text-gray-600">Backend Developer</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image
                      src="/stella.webp"
                      alt="Stella Maureen Ignacia Santoso"
                      width={60}
                      height={60}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Stella Maureen Ignacia Santoso</h3>
                    <p className="text-sm text-gray-600">Frontend Developer</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mentor Section */}
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 text-center">Mentor</h2>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Image
                    src="/windra.webp"
                    alt="Windra Swastika, S.Kom., MT., Ph.D."
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-100"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Windra Swastika, S.Kom., MT., Ph.D.</h3>
                  <p className="text-gray-600 mt-1">Dosen Pembimbing</p>
                  <p className="text-purple-600 font-medium mt-1">Fakultas Teknologi dan Desain</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}