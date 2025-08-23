'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function TambahPengingatPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  if (!isLoaded) return <div>Loading...</div>
  if (!user) redirect('/sign-in')

  const [formData, setFormData] = useState({
    isiPesan: 'Minum obat candesartan',
    interval: 'Harian',
    jam: '12.00',
    tanggal: '17/08/2025',
    jumlah: '5'
  })

  const handleSubmit = () => {
    console.log('Form submitted:', formData)
    // Handle form submission
    alert('Pengingat berhasil ditambahkan!')
    router.back()
  }

  const handleBatal = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="text-blue-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          <div className="bg-blue-500 rounded-full p-2">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <form className="space-y-6">
          {/* Isi Pesan */}
          <div>
            <label className="block text-gray-600 mb-2">Isi Pesan</label>
            <input
              type="text"
              value={formData.isiPesan}
              onChange={(e) => setFormData({ ...formData, isiPesan: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none bg-blue-50"
              placeholder="Masukkan pesan pengingat"
            />
          </div>

          {/* Interval Pengingat */}
          <div>
            <label className="block text-gray-600 mb-2">Interval Pengingat</label>
            <div className="relative">
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none bg-blue-50 appearance-none"
              >
                <option value="Harian">Harian</option>
                <option value="Mingguan">Mingguan</option>
                <option value="Bulanan">Bulanan</option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Jam Pengingat */}
          <div>
            <label className="block text-gray-600 mb-2">Jam Pengingat</label>
            <div className="relative">
              <input
                type="text"
                value={formData.jam}
                onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none bg-blue-50"
                placeholder="HH.MM"
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            </div>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label className="block text-gray-600 mb-2">Tanggal Mulai</label>
            <div className="relative">
              <input
                type="text"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none bg-blue-50"
                placeholder="DD/MM/YYYY"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            </div>
          </div>

          {/* Jumlah Pengingat */}
          <div>
            <label className="block text-gray-600 mb-2">Jumlah Pengingat</label>
            <input
              type="number"
              value={formData.jumlah === '0' ? '' : formData.jumlah}
              onChange={(e) => {
                const value = e.target.value
                setFormData({ 
                  ...formData, 
                  jumlah: value === '' ? '' : value 
                })
              }}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none bg-blue-50"
              placeholder="Masukkan jumlah"
              min="1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={handleBatal}
              className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-full font-medium flex items-center justify-center space-x-2"
            >
              <span>✕</span>
              <span>Batal</span>
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-red-500 text-white py-3 px-6 rounded-full font-medium flex items-center justify-center space-x-2"
            >
              <span>▶</span>
              <span>Submit</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}