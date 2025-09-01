'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Settings } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export default function TestWhatsAppPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    phoneNumber: '081234567890', // Default test number
    patientName: 'Testing User',
    medicationName: 'Tamoxifen',
    dosage: '20mg - 1 tablet'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const currentHour = new Date().toLocaleTimeString('id-ID', { 
        timeZone: 'Asia/Jakarta', 
        hour: '2-digit', 
        minute: '2-digit'
      })

      const greeting = (() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Selamat Pagi'
        if (hour < 15) return 'Selamat Siang' 
        if (hour < 18) return 'Selamat Sore'
        return 'Selamat Malam'
      })()

      const testMessage = `🏥 *PRIMA Reminder*

${greeting}, ${formData.patientName}! 👋

⏰ Waktunya minum obat:
💊 ${formData.medicationName}
📝 Dosis: ${formData.dosage}
🕐 Jam: ${currentHour} WIB

📌 Catatan Penting:
Minum setelah makan dengan air putih

✅ Balas "MINUM" jika sudah minum obat
❓ Balas "BANTUAN" untuk bantuan
📞 Darurat: 0341-550171

Semangat sembuh! 💪
Tim PRIMA - Berbagi Kasih`

      // Use test endpoint
      const response = await fetch('/api/test?type=whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          patientName: formData.patientName,
          medicationName: formData.medicationName,
          dosage: formData.dosage
        }),
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Test error:', error)
      setResult({
        success: false,
        error: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Test WhatsApp System</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Test PRIMA WhatsApp System</h2>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-green-600 font-medium">
                Fonnte (Primary)
              </span>
            </div>
          </div>
          
          <form onSubmit={handleTestSend} className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor HP Tujuan *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="08123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 08xxxxxxxx atau 628xxxxxxxx (nomor HP Indonesia)
              </p>
            </div>

            {/* Patient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Pasien
              </label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Medication Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Obat
              </label>
              <input
                type="text"
                name="medicationName"
                value={formData.medicationName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosis
              </label>
              <input
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>


            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Mengirim...' : 'Kirim Test WhatsApp'}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-4 ${
            result.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-medium mb-2 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ Berhasil' : '❌ Gagal'}
            </h3>
            
            <pre className={`text-sm ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* System Status */}
        <div className="mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-2">🟢 FONNTE Status</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Primary WhatsApp provider</li>
              <li>✅ Ready for production use</li>
              <li>✅ No sandbox limitations</li>
              <li>✅ Indonesian healthcare optimized</li>
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">📋 System Information</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Provider:</strong> Fonnte WhatsApp API</p>
            <p><strong>Cron Service:</strong> app.fastcron.com (2-minute intervals)</p>
            <p><strong>Authentication:</strong> Stack Auth with Gmail OAuth</p>
            <p><strong>Target:</strong> Indonesian healthcare volunteers</p>
          </div>
        </div>
      </main>
    </div>
  )
}