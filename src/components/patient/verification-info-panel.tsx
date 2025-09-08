'use client'

import { formatDateTimeWIB } from '@/lib/datetime'
import { getPatientDisplayStatus } from '@/lib/patient-status'

interface VerificationInfoPanelProps {
  status: string
  patient: any
}

export default function VerificationInfoPanel({ status, patient }: VerificationInfoPanelProps) {
  // Use centralized status logic to detect BERHENTI vs genuine declined
  const patientStatus = getPatientDisplayStatus(patient)
  
  const getStatusInfo = (displayStatus: string) => {
    switch (displayStatus) {
      case 'Menunggu Verifikasi':
        return {
          type: 'warning',
          icon: '⏳',
          title: 'Menunggu Respon Pasien',
          description: 'Pesan verifikasi sudah dikirim. Pasien belum merespon.',
          reminder: '• Pesan akan kedaluwarsa dalam 48 jam\n• Jika tidak ada respon, hubungi pasien langsung\n• Reminder BELUM aktif sampai pasien menyetujui',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        }
        
      case 'Terverifikasi':
        return {
          type: 'success',
          icon: '✅',
          title: 'Terverifikasi - Reminder Aktif',
          description: 'Pasien telah menyetujui untuk menerima reminder.',
          reminder: '• Reminder WhatsApp sudah aktif\n• Pesan akan dikirim sesuai jadwal\n• Pasien bisa reply "BERHENTI" untuk stop reminder',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        }
        
      case 'Menolak':
        return {
          type: 'error',
          icon: '❌',
          title: 'Pasien Menolak',
          description: 'Pasien tidak menyetujui untuk menerima reminder.',
          reminder: '• Reminder WhatsApp TIDAK aktif\n• Pertimbangkan pendekatan alternatif\n• Bisa coba negoisasi ulang dengan pasien',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        }
        
      case 'BERHENTI':
        return {
          type: 'error',
          icon: '🛑',
          title: 'Pasien BERHENTI dari Layanan',
          description: 'Pasien mengirim pesan BERHENTI dan keluar dari layanan.',
          reminder: '• Pasien TIDAK AKTIF dan tidak menerima reminder\n• Semua reminder telah dinonaktifkan otomatis\n• Gunakan tombol "Aktifkan Kembali" jika pasien ingin bergabung lagi',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        }
        
      case 'Kedaluwarsa':
        return {
          type: 'warning',
          icon: '⏰',
          title: 'Verifikasi Kedaluwarsa',
          description: 'Tidak ada respon dari pasien dalam 48 jam.',
          reminder: '• Hubungi pasien secara langsung (telepon/kunjungan)\n• Pastikan nomor WhatsApp benar\n• Kirim ulang verifikasi jika diperlukan',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        }
        
      default:
        return null
    }
  }

  const statusInfo = getStatusInfo(patientStatus.displayStatus)
  if (!statusInfo) return null

  return (
    <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-xl p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{statusInfo.icon}</span>
        <div className="flex-1">
          <h4 className={`font-semibold ${statusInfo.textColor} mb-1`}>
            {statusInfo.title}
          </h4>
          <p className={`${statusInfo.textColor} text-sm mb-3`}>
            {statusInfo.description}
          </p>
          
          <div className={`${statusInfo.textColor} text-sm`}>
            <strong>📋 Yang Perlu Diketahui:</strong>
            <div className="mt-1 whitespace-pre-line">
              {statusInfo.reminder}
            </div>
          </div>
          
          {/* Verification timing info */}
          {patient.verificationSentAt && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <strong className="text-gray-600">📅 Dikirim:</strong>
                  <br />
                  <span className="text-gray-800">
                    {formatDateTimeWIB(new Date(patient.verificationSentAt))}
                  </span>
                </div>
                
                {patient.verificationResponseAt && (
                  <div>
                    <strong className="text-gray-600">✅ Direspon:</strong>
                    <br />
                    <span className="text-gray-800">
                      {formatDateTimeWIB(new Date(patient.verificationResponseAt))}
                    </span>
                  </div>
                )}
                
                {patient.verificationAttempts && parseInt(patient.verificationAttempts) > 1 && (
                  <div>
                    <strong className="text-gray-600">🔄 Percobaan:</strong>
                    <br />
                    <span className="text-gray-800">
                      {patient.verificationAttempts} kali
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Phone number display for easy calling */}
          {(patientStatus.displayStatus === 'Kedaluwarsa' || patientStatus.displayStatus === 'Menolak' || patientStatus.displayStatus === 'BERHENTI') && (
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm text-gray-600 mb-1">📞 Kontak pasien untuk follow-up:</p>
              <div className="flex items-center gap-2">
                <a 
                  href={`tel:${patient.phoneNumber}`}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {patient.phoneNumber}
                </a>
                <a 
                  href={`https://wa.me/${patient.phoneNumber.replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 text-sm hover:underline"
                >
                  📱 WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}