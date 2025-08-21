'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, RefreshCw, Clock } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { toast } from '@/components/ui/toast'

export default function CronPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const handleManualTrigger = async () => {
    setIsRunning(true)
    
    try {
      toast.info('Menjalankan cron job...', {
        description: 'Mengecek dan mengirim reminder yang terjadwal'
      })

      const response = await fetch('/api/cron/test', {
        method: 'POST',
      })

      const result = await response.json()
      setLastResult(result)

      if (response.ok) {
        const stats = result.result?.stats
        if (stats) {
          toast.success('Cron job berhasil dijalankan', {
            description: `Diproses: ${stats.processed}, Terkirim: ${stats.sent}, Error: ${stats.errors}`
          })
        } else {
          toast.success('Cron job selesai')
        }
      } else {
        toast.error('Cron job gagal', {
          description: result.error || 'Terjadi kesalahan'
        })
      }
    } catch (error) {
      console.error('Error running cron:', error)
      toast.error('Gagal menjalankan cron job', {
        description: 'Terjadi kesalahan jaringan'
      })
    } finally {
      setIsRunning(false)
    }
  }

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
          <Clock className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Cron Job Management</h2>
        </div>

        {/* Manual Trigger Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Manual Trigger</h3>
          <p className="text-gray-600 text-sm mb-4">
            Jalankan cron job secara manual untuk testing. Ini akan mengecek semua reminder yang jadwalnya hari ini dan mengirim yang sudah waktunya.
          </p>
          
          <button
            onClick={handleManualTrigger}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Sedang Berjalan...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Jalankan Cron Job</span>
              </>
            )}
          </button>
        </div>

        {/* Last Result Section */}
        {lastResult && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Hasil Terakhir</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {lastResult.result?.stats && (
                  <>
                    <div>
                      <span className="text-gray-600">Total Diproses:</span>
                      <span className="font-semibold ml-2">{lastResult.result.stats.processed}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Terkirim:</span>
                      <span className="font-semibold ml-2 text-green-600">{lastResult.result.stats.sent}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Error:</span>
                      <span className="font-semibold ml-2 text-red-600">{lastResult.result.stats.errors}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Jadwal:</span>
                      <span className="font-semibold ml-2">{lastResult.result.stats.total_schedules}</span>
                    </div>
                  </>
                )}
                {lastResult.result?.wibTime && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Waktu:</span>
                    <span className="font-semibold ml-2">{lastResult.result.wibTime}</span>
                  </div>
                )}
                {lastResult.result?.duration && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Durasi:</span>
                    <span className="font-semibold ml-2">{lastResult.result.duration}</span>
                  </div>
                )}
              </div>
              
              {/* Raw JSON for debugging */}
              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Lihat Raw Response (Debug)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 rounded-xl p-6 mt-6">
          <h3 className="text-md font-semibold text-blue-900 mb-2">ℹ️ Informasi</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Cron job mengecek reminder yang jadwalnya hari ini</li>
            <li>• Hanya mengirim reminder dalam window 5 menit setelah jadwal</li>
            <li>• Reminder yang sudah terkirim tidak akan dikirim ulang</li>
            <li>• Untuk production, gunakan Vercel Cron Functions</li>
          </ul>
        </div>
      </main>
    </div>
  )
}