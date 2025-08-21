'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

export default function AboutPage() {
  const router = useRouter()

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
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Info className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Tentang Prima</h2>
        </div>

        {/* Description */}
        <div className="bg-blue-500 text-white rounded-2xl p-6 mb-8">
          <p className="text-white leading-relaxed text-sm">
            Aplikasi ini dibuat untuk membantu relawan dalam mendampingi pasien kanker payudara. 
            Melalui fitur pencatatan pasien dan sistem pengingat otomatis, relawan dapat mengatur 
            jadwal minum obat maupun jadwal kontrol pasien. Notifikasi dikirimkan langsung melalui 
            WhatsApp, sehingga pasien tetap terpantau dan tidak melewatkan perawatan penting.
          </p>
        </div>

        {/* Developer Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Tim Pengembang</h3>
          
          {/* Developer Cards */}
          <div className="space-y-4">
            {/* Developer 1 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
                {/* Placeholder for developer photo */}
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">D1</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Developer 1</h4>
                <p className="text-sm text-gray-600">Full Stack Developer</p>
                <p className="text-xs text-gray-500 mt-1">
                  Spesialisasi dalam pengembangan aplikasi web dan integrasi API
                </p>
              </div>
            </div>

            {/* Developer 2 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
                {/* Placeholder for developer photo */}
                <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">D2</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Developer 2</h4>
                <p className="text-sm text-gray-600">UI/UX Designer & Frontend Developer</p>
                <p className="text-xs text-gray-500 mt-1">
                  Fokus pada desain antarmuka dan pengalaman pengguna yang intuitif
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Informasi Aplikasi</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Versi:</span>
              <span className="text-gray-900 font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="text-gray-900 font-medium">Web Application</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teknologi:</span>
              <span className="text-gray-900 font-medium">Next.js, React</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database:</span>
              <span className="text-gray-900 font-medium">PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">WhatsApp API:</span>
              <span className="text-gray-900 font-medium">Twilio</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Fitur Utama</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Manajemen data pasien kanker payudara</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Pencatatan gejala dan kondisi pasien</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Sistem pengingat obat otomatis via WhatsApp</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Tracking kepatuhan minum obat</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Dashboard analytics untuk relawan</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Interface mobile-first yang user-friendly</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-2">Dukungan & Bantuan</h3>
          <p className="text-sm text-gray-600 mb-3">
            Untuk bantuan teknis atau pertanyaan seputar penggunaan aplikasi, hubungi tim pengembang.
          </p>
          <p className="text-xs text-gray-500">
            © 2025 PRIMA (Palliative Remote Integrated Monitoring and Assistance)
          </p>
        </div>
      </main>
    </div>
  )
}