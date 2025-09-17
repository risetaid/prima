'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Settings, Pill, AlertCircle } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import {
  MedicationDetailsSchema
} from '@/lib/medication-parser'

type TestResult = {
  success: boolean;
  error?: string;
};

const MEDICATION_CATEGORIES = [
  { value: 'CHEMOTHERAPY', label: 'Kemoterapi' },
  { value: 'TARGETED_THERAPY', label: 'Terapi Target' },
  { value: 'IMMUNOTHERAPY', label: 'Imunoterapi' },
  { value: 'HORMONAL_THERAPY', label: 'Terapi Hormonal' },
  { value: 'PAIN_MANAGEMENT', label: 'Pengelolaan Nyeri' },
  { value: 'ANTIEMETIC', label: 'Antiemetik' },
  { value: 'ANTIBIOTIC', label: 'Antibiotik' },
  { value: 'ANTIVIRAL', label: 'Antiviral' },
  { value: 'ANTIFUNGAL', label: 'Antijamur' },
  { value: 'SUPPLEMENT', label: 'Suplemen' },
  { value: 'OTHER', label: 'Lainnya' },
];

const MEDICATION_FORMS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Kapsul' },
  { value: 'LIQUID', label: 'Cairan' },
  { value: 'INJECTION', label: 'Injeksi' },
  { value: 'INFUSION', label: 'Infus' },
  { value: 'CREAM', label: 'Krim' },
  { value: 'PATCH', label: 'Plester' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'SPRAY', label: 'Semprot' },
  { value: 'OTHER', label: 'Lainnya' },
];

const DOSAGE_UNITS = [
  { value: 'MG', label: 'mg' },
  { value: 'G', label: 'g' },
  { value: 'ML', label: 'ml' },
  { value: 'MCG', label: 'mcg' },
  { value: 'IU', label: 'IU' },
  { value: 'TABLET', label: 'tablet' },
  { value: 'CAPSULE', label: 'kapsul' },
  { value: 'DOSE', label: 'dosis' },
  { value: 'PUFF', label: 'puff' },
  { value: 'DROP', label: 'tetes' },
  { value: 'PATCH', label: 'plester' },
  { value: 'OTHER', label: 'lainnya' },
];

const FREQUENCIES = [
  { value: 'ONCE_DAILY', label: '1x sehari' },
  { value: 'TWICE_DAILY', label: '2x sehari' },
  { value: 'THREE_TIMES_DAILY', label: '3x sehari' },
  { value: 'FOUR_TIMES_DAILY', label: '4x sehari' },
  { value: 'EVERY_8_HOURS', label: 'Setiap 8 jam' },
  { value: 'EVERY_12_HOURS', label: 'Setiap 12 jam' },
  { value: 'EVERY_24_HOURS', label: 'Setiap 24 jam' },
  { value: 'EVERY_WEEK', label: 'Setiap minggu' },
  { value: 'EVERY_MONTH', label: 'Setiap bulan' },
  { value: 'AS_NEEDED', label: 'Bila perlu' },
  { value: 'CUSTOM', label: 'Kustom' },
];

const TIMINGS = [
  { value: 'BEFORE_MEAL', label: 'Sebelum makan' },
  { value: 'WITH_MEAL', label: 'Saat makan' },
  { value: 'AFTER_MEAL', label: 'Setelah makan' },
  { value: 'BEDTIME', label: 'Sebelum tidur' },
  { value: 'MORNING', label: 'Pagi' },
  { value: 'AFTERNOON', label: 'Siang' },
  { value: 'EVENING', label: 'Sore' },
  { value: 'ANYTIME', label: 'Kapan saja' },
];

export default function TestWhatsAppPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [useStructuredMedication, setUseStructuredMedication] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    phoneNumber: '081234567890', // Default test number
    patientName: 'Testing User',
    // Structured medication data
    medicationName: 'Candesartan',
    genericName: 'Candesartan Cilexetil',
    category: 'OTHER' as const,
    form: 'TABLET' as const,
    dosage: '20mg',
    dosageValue: 20,
    dosageUnit: 'MG' as const,
    frequency: 'ONCE_DAILY' as const,
    timing: 'BEFORE_MEAL' as const,
    instructions: 'Minum dengan air putih, jangan digiling',
    // Legacy dosage field for backward compatibility
    legacyDosage: '20mg - 1 tablet'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dosageValue' ? parseFloat(value) || 0 : value
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setErrors({})

    // Validate structured medication if enabled
    if (useStructuredMedication) {
      try {
        const medicationData = {
          name: formData.medicationName,
          genericName: formData.genericName || undefined,
          category: formData.category,
          form: formData.form,
          dosage: formData.dosage,
          dosageValue: formData.dosageValue || undefined,
          dosageUnit: formData.dosageUnit,
          frequency: formData.frequency,
          timing: formData.timing,
          instructions: formData.instructions || undefined,
        }

        MedicationDetailsSchema.parse(medicationData)
      } catch (error) {
        if (error instanceof Error) {
          setErrors({
            ...errors,
            medication: 'Data obat tidak valid: ' + error.message
          })
        }
        setLoading(false)
        return
      }
    }

    try {
      const payload = {
        phoneNumber: formData.phoneNumber,
        patientName: formData.patientName,
        ...(useStructuredMedication ? {
          medicationDetails: {
            name: formData.medicationName,
            genericName: formData.genericName,
            category: formData.category,
            form: formData.form,
            dosage: formData.dosage,
            dosageValue: formData.dosageValue,
            dosageUnit: formData.dosageUnit,
            frequency: formData.frequency,
            timing: formData.timing,
            instructions: formData.instructions,
          }
        } : {
          dosage: formData.legacyDosage
        })
      }

      // Use test endpoint
      const response = await fetch('/api/test?type=whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const generateMedicationPreview = () => {
    if (!useStructuredMedication) {
      return `Halo ${formData.patientName}, ini adalah pengingat untuk minum obat dengan dosis: ${formData.legacyDosage}`
    }

    return `Halo ${formData.patientName}, ini adalah pengingat untuk minum obat ${formData.medicationName} (${formData.dosage})${formData.instructions ? '. ' + formData.instructions : ''}`
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

          {/* Structured Medication Toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Data Obat Terstruktur
                </h4>
                <p className="text-xs text-blue-700">
                  Gunakan format data obat terstruktur untuk testing
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseStructuredMedication(!useStructuredMedication)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                useStructuredMedication
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {useStructuredMedication ? "Aktif" : "Aktifkan"}
            </button>
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

            {/* Structured Medication Form */}
            {useStructuredMedication ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <h3 className="text-md font-semibold">Detail Obat Terstruktur</h3>
                </div>

                {/* Medication Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Obat *
                  </label>
                  <input
                    type="text"
                    name="medicationName"
                    value={formData.medicationName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Candesartan"
                    required={useStructuredMedication}
                  />
                </div>

                {/* Generic Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Generik (Opsional)
                  </label>
                  <input
                    type="text"
                    name="genericName"
                    value={formData.genericName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Candesartan Cilexetil"
                  />
                </div>

                {/* Category and Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={useStructuredMedication}
                    >
                      {MEDICATION_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bentuk *
                    </label>
                    <select
                      name="form"
                      value={formData.form}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={useStructuredMedication}
                    >
                      {MEDICATION_FORMS.map(form => (
                        <option key={form.value} value={form.value}>{form.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosis *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="dosage"
                      value={formData.dosage}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: 20mg"
                      required={useStructuredMedication}
                    />
                    <select
                      name="dosageUnit"
                      value={formData.dosageUnit}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {DOSAGE_UNITS.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequency and Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frekuensi *
                    </label>
                    <select
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={useStructuredMedication}
                    >
                      {FREQUENCIES.map(freq => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Minum *
                    </label>
                    <select
                      name="timing"
                      value={formData.timing}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={useStructuredMedication}
                    >
                      {TIMINGS.map(timing => (
                        <option key={timing.value} value={timing.value}>{timing.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instruksi (Opsional)
                  </label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Contoh: Minum dengan air putih, jangan digiling"
                  />
                </div>

                {/* Message Preview */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">
                    Pratinjau Pesan:
                  </h4>
                  <div className="bg-white p-3 rounded border text-sm text-gray-800">
                    {generateMedicationPreview()}
                  </div>
                </div>

                {errors.medication && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.medication}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Legacy Dosage Field */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosis
                </label>
                <input
                  type="text"
                  name="legacyDosage"
                  value={formData.legacyDosage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

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

        {/* Structured Medication Testing Info */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-800 mb-2">💊 Structured Medication Testing</h3>
          <div className="text-sm text-purple-700 space-y-2">
            <p><strong>Feature:</strong> Enhanced medication data with structured fields</p>
            <p><strong>Validation:</strong> Zod schema validation for all medication data</p>
            <p><strong>Categories:</strong> 11 medication categories including chemotherapy, antibiotics</p>
            <p><strong>Dosage Units:</strong> 12 standardized units (mg, ml, tablet, etc.)</p>
            <p><strong>Frequency:</strong> 11 frequency options from daily to monthly</p>
            <p><strong>Timing:</strong> 8 timing options (before/after meals, bedtime, etc.)</p>
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

