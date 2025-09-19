'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, AlertCircle, Info } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

type TestResult = {
  success: boolean;
  error?: string;
};

interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  message: string;
  category: 'reminder' | 'verification' | 'followup' | 'emergency';
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'reminder_basic',
    name: 'Pengingat Dasar',
    description: 'Pengingat sederhana untuk kegiatan sehari-hari',
    category: 'reminder',
    message: 'Halo [Nama Pasien]! Ini adalah pengingat untuk [aktivitas]. Jangan lupa dilakukan ya. 💙 Tim PRIMA'
  },
  {
    id: 'reminder_health',
    name: 'Pengingat Kesehatan',
    description: 'Pengingat terkait kesehatan dan perawatan',
    category: 'reminder',
    message: 'Halo [Nama Pasien]! ⏰ Waktunya untuk [aktivitas kesehatan]. Jaga kesehatan Anda dengan konsisten. 💙 Tim PRIMA'
  },
  {
    id: 'verification_welcome',
    name: 'Verifikasi Selamat Datang',
    description: 'Pesan verifikasi untuk pasien baru',
    category: 'verification',
    message: 'Halo [Nama Pasien]! 🎉 Selamat datang di layanan PRIMA. Kami siap membantu perawatan kesehatan Anda. 💙 Tim PRIMA'
  },
  {
    id: 'followup_check',
    name: 'Follow-up Check',
    description: 'Pesan follow-up setelah pengingat',
    category: 'followup',
    message: 'Halo [Nama Pasien]! ⏰ Kami ingin memastikan Anda sudah mengikuti pengingat sebelumnya. Apakah sudah dilakukan? 💙 Tim PRIMA'
  },
  {
    id: 'emergency_info',
    name: 'Informasi Darurat',
    description: 'Panduan darurat untuk pasien',
    category: 'emergency',
    message: '🚨 Halo [Nama Pasien]! Jika Anda mengalami keadaan darurat, segera hubungi layanan darurat 118/119 atau kunjungi fasilitas kesehatan terdekat. 💙 Tim PRIMA'
  }
]

export default function TestWhatsAppPage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(MESSAGE_TEMPLATES[0])
  const [patientName, setPatientName] = useState('Budi Santoso')
  const [customActivity, setCustomActivity] = useState('minum air putih 8 gelas')
  const [customMessage, setCustomMessage] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('+6281234567890')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const generateMessage = (): string => {
    if (customMessage.trim()) {
      return customMessage
    }

    let message = selectedTemplate.message
    message = message.replace('[Nama Pasien]', patientName)
    message = message.replace('[aktivitas]', customActivity)
    message = message.replace('[aktivitas kesehatan]', customActivity)

    return message
  }

  const handleTest = async () => {
    if (!phoneNumber.trim()) {
      setTestResult({ success: false, error: 'Nomor WhatsApp harus diisi' })
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          message: generateMessage(),
          patientName,
          category: selectedTemplate.category
        })
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({ success: true })
      } else {
        setTestResult({ success: false, error: result.error || 'Gagal mengirim pesan' })
      }
    } catch {
      setTestResult({ success: false, error: 'Terjadi kesalahan jaringan' })
    } finally {
      setIsTesting(false)
    }
  }

  const filteredTemplates = MESSAGE_TEMPLATES.filter(template => {
    if (!customMessage.trim()) return true
    return template.message.toLowerCase().includes(customMessage.toLowerCase()) ||
           template.name.toLowerCase().includes(customMessage.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test WhatsApp</h1>
                <p className="text-sm text-gray-600">Uji pengiriman pesan WhatsApp</p>
              </div>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Informasi Testing</h3>
              <p className="text-sm text-blue-700 mt-1">
                Halaman ini digunakan untuk testing pengiriman pesan WhatsApp.
                Pilih template pesan atau buat pesan custom, lalu kirim ke nomor tujuan untuk testing.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Phone Number */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor WhatsApp *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+6281234567890"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: +62 diikuti nomor HP (contoh: +6281234567890)
              </p>
            </div>

            {/* Patient Name */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Pasien
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nama pasien"
              />
            </div>

            {/* Custom Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aktivitas Custom (untuk template)
              </label>
              <input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="minum air putih 8 gelas"
              />
            </div>
          </div>

          {/* Right Column - Message Selection & Preview */}
          <div className="space-y-6">
            {/* Custom Message */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pesan Custom (opsional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kosongkan untuk menggunakan template..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Jika diisi, akan mengganti template pesan yang dipilih
              </p>
            </div>

            {/* Template Selection */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pilih Template Pesan
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        template.category === 'reminder' ? 'bg-blue-100 text-blue-800' :
                        template.category === 'verification' ? 'bg-green-100 text-green-800' :
                        template.category === 'followup' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Preview */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preview Pesan
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {generateMessage()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mt-6 rounded-xl p-4 ${
            testResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <>
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-800 font-medium">Pesan berhasil dikirim!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">Gagal mengirim pesan</span>
                </>
              )}
            </div>
            {testResult.error && (
              <p className="text-red-700 text-sm mt-2">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Test Kirim</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}