'use client'

type VerificationStatus = 'pending_verification' | 'verified' | 'declined' | 'expired' | 'unsubscribed'

interface VerificationBadgeProps {
  status: VerificationStatus
  size?: 'small' | 'large'
  className?: string
}

export default function VerificationBadge({ 
  status, 
  size = 'small', 
  className = '' 
}: VerificationBadgeProps) {
  const statusConfig = {
    pending_verification: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⏳',
      text: 'Menunggu'
    },
    verified: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      text: 'Terverifikasi'
    },
    declined: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '❌',
      text: 'Menolak'
    },
    expired: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '⏰',
      text: 'Kedaluwarsa'
    },
    unsubscribed: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '🛑',
      text: 'Berhenti'
    }
  }

  const config = statusConfig[status] || statusConfig.pending_verification
  const sizeClasses = size === 'large' 
    ? 'px-4 py-2 text-sm font-semibold' 
    : 'px-2.5 py-0.5 text-xs font-medium'

  return (
    <span 
      className={`inline-flex items-center rounded-full border ${config.color} ${sizeClasses} ${className}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  )
}

export function getVerificationStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    pending_verification: 'Menunggu Persetujuan',
    verified: 'Telah Disetujui',
    declined: 'Ditolak Pasien',
    expired: 'Tidak Ada Respon',
    unsubscribed: 'Berhenti dari Layanan'
  }
  return titles[status] || 'Status Tidak Dikenal'
}

export function getVerificationStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    pending_verification: 'Pesan verifikasi sudah dikirim, menunggu respon pasien',
    verified: 'Pasien menyetujui untuk menerima reminder WhatsApp',
    declined: 'Pasien menolak untuk menerima reminder WhatsApp',
    expired: 'Pasien tidak merespon dalam 48 jam setelah pesan dikirim',
    unsubscribed: 'Pasien mengirim BERHENTI dan keluar dari layanan'
  }
  return descriptions[status] || 'Status verifikasi tidak dikenal'
}