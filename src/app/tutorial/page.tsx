'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ArrowLeft, HelpCircle, Play, Book, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TutorialPage() {
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
          <h1 className="text-xl font-bold text-gray-900 flex-1">Tutorial</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Categories */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500 text-white rounded-lg p-4 text-center shadow-lg">
            <Video className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Video Tutorial</h3>
          </div>
          <div className="bg-green-500 text-white rounded-lg p-4 text-center shadow-lg">
            <Book className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Panduan Tertulis</h3>
          </div>
        </div>

        {/* Tutorial List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tutorial Terpopuler</h2>
          
          {/* Video Tutorial 1 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Cara Menggunakan Aplikasi PRIMA</h3>
                <p className="text-sm text-gray-600 mt-1">Panduan lengkap untuk menggunakan aplikasi PRIMA untuk pertama kali</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Video</span>
                  <span className="text-xs text-gray-500">5 menit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Tutorial 2 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Mengatur Pengingat Minum Obat</h3>
                <p className="text-sm text-gray-600 mt-1">Tutorial cara mengatur dan mengelola pengingat minum obat</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Video</span>
                  <span className="text-xs text-gray-500">3 menit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Written Guide 1 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Book className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Memahami Efek Samping Kemoterapi</h3>
                <p className="text-sm text-gray-600 mt-1">Panduan lengkap mengenai efek samping dan cara mengatasinya</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Artikel</span>
                  <span className="text-xs text-gray-500">10 menit baca</span>
                </div>
              </div>
            </div>
          </div>

          {/* Written Guide 2 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Book className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Tips Nutrisi Selama Pengobatan</h3>
                <p className="text-sm text-gray-600 mt-1">Panduan nutrisi yang tepat untuk mendukung proses pengobatan</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Artikel</span>
                  <span className="text-xs text-gray-500">8 menit baca</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">FAQ - Pertanyaan Sering Ditanya</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Bagaimana cara mengubah jadwal minum obat?</h3>
                  <p className="text-sm text-gray-600 mt-1">Anda dapat mengubah jadwal minum obat melalui menu Pengingat...</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Apa yang harus dilakukan jika terlewat minum obat?</h3>
                  <p className="text-sm text-gray-600 mt-1">Jika terlewat minum obat, segera hubungi dokter atau tim medis...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}