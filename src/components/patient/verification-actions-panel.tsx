'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

interface VerificationActionsPanelProps {
  patient: any
  onUpdate: () => void
}

export default function VerificationActionsPanel({ 
  patient, 
  onUpdate 
}: VerificationActionsPanelProps) {
  const [sending, setSending] = useState(false)
  const [showManualVerify, setShowManualVerify] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false)

  const handleSendVerification = async () => {
    setSending(true)
    try {
      const response = await fetch(`/api/patients/${patient.id}/send-verification`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`✅ Pesan verifikasi berhasil dikirim ke ${patient.phoneNumber}`)
        onUpdate()
      } else {
        toast.error(`❌ Gagal mengirim pesan verifikasi: ${data.error}`)
      }
    } catch (error) {
      console.error('Send verification error:', error)
      toast.error('❌ Terjadi kesalahan saat mengirim verifikasi')
    }
    setSending(false)
  }

  const handleManualVerification = async (status: string) => {
    try {
      const response = await fetch(`/api/patients/${patient.id}/manual-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          reason: `Manual verification by volunteer: ${status}` 
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`✅ Status diubah menjadi ${status}`)
        onUpdate()
        setShowManualVerify(false)
      } else {
        toast.error(`❌ Gagal mengubah status: ${data.error}`)
      }
    } catch (error) {
      console.error('Manual verification error:', error)
      toast.error('❌ Gagal mengubah status')
    }
  }

  const handleReactivation = async () => {
    setIsReactivateModalOpen(true)
  }

  const confirmReactivation = async () => {
    setReactivating(true)
    try {
      const response = await fetch(`/api/patients/${patient.id}/reactivate`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`✅ ${data.message}`)
        toast.info(`ℹ️ ${data.nextStep}`)
        onUpdate()
      } else {
        toast.error(`❌ Gagal mengaktifkan kembali: ${data.error}`)
      }
    } catch (error) {
      console.error('Error reactivating patient:', error)
      toast.error('❌ Terjadi kesalahan saat mengaktifkan kembali pasien')
    } finally {
      setReactivating(false)
    }
  }

  return (
    <div className="actions-panel">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h4 className="font-medium text-gray-900">Aksi Verifikasi</h4>
      </div>
      
      <div className="space-y-3">
        {/* Primary Actions based on status */}
        {(patient.verificationStatus === 'pending_verification' || 
          patient.verificationStatus === 'expired' ||
          !patient.verificationStatus) && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSendVerification}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 font-medium"
            >
              {sending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Mengirim...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Kirim {patient.verificationStatus === 'expired' ? 'Ulang' : ''} Verifikasi
                </>
              )}
            </button>
            
            <button
              onClick={() => setShowManualVerify(!showManualVerify)}
              className="flex-1 sm:flex-none px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-all duration-200 font-medium"
            >
              Verifikasi Manual
            </button>
          </div>
        )}

        {patient.verificationStatus === 'declined' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSendVerification}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 font-medium"
            >
              {sending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Mengirim...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Coba Lagi
                </>
              )}
            </button>
            
            <button
              onClick={() => handleManualVerification('verified')}
              className="flex-1 sm:flex-none px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-all duration-200 font-medium"
            >
              Setujui Manual
            </button>
          </div>
        )}

        {patient.verificationStatus === 'verified' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-medium mb-1">
                  Pasien sudah terverifikasi
                </p>
                <p className="text-green-700 text-sm mb-3">
                  Reminder otomatis sudah aktif untuk pasien ini.
                </p>
                <button
                  onClick={() => handleManualVerification('pending_verification')}
                  className="text-sm text-green-600 hover:text-green-800 underline font-medium"
                >
                  Reset verifikasi jika diperlukan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inactive Patient (BERHENTI) Section */}
        {!patient.isActive && patient.verificationStatus === 'declined' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-800 font-medium mb-1">
                  Pasien Tidak Aktif (BERHENTI)
                </p>
                <p className="text-red-700 text-sm mb-3">
                  Pasien telah mengirim pesan BERHENTI dan tidak menerima reminder.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReactivation}
                    disabled={reactivating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 font-medium"
                  >
                    {reactivating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Mengaktifkan...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Aktifkan Kembali
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Verification Options */}
      {showManualVerify && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-amber-900 mb-1">Verifikasi Manual</h5>
              <p className="text-sm text-amber-700 mb-3">
                Gunakan jika sudah konfirmasi langsung dengan pasien via telepon atau tatap muka.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleManualVerification('verified')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 cursor-pointer transition-all duration-200 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Tandai Setuju
            </button>
            <button
              onClick={() => handleManualVerification('declined')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 cursor-pointer transition-all duration-200 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Tandai Menolak
            </button>
            <button
              onClick={() => setShowManualVerify(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 cursor-pointer transition-all duration-200 font-medium"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Reactivation Confirmation Modal */}
      <ConfirmationModal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        onConfirm={confirmReactivation}
        title="Aktifkan Kembali Pasien"
        description="Yakin ingin mengaktifkan kembali pasien ini? Pasien akan kembali ke status 'Menunggu Verifikasi'."
        confirmText="Ya, Aktifkan"
        cancelText="Batal"
        loading={reactivating}
      />
    </div>
  )
}

