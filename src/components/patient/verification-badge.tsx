'use client'

interface VerificationBadgeProps {
  status: string
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
  const titles = {
    pending_verification: 'Menunggu Persetujuan',
    verified: 'Telah Disetujui',
    declined: 'Ditolak Pasien',
    expired: 'Tidak Ada Respon'
  }
  return titles[status] || 'Status Tidak Dikenal'
}

export function getVerificationStatusDescription(status: string): string {
  const descriptions = {
    pending_verification: 'Pesan verifikasi sudah dikirim, menunggu respon pasien',
    verified: 'Pasien menyetujui untuk menerima reminder WhatsApp',
    declined: 'Pasien menolak untuk menerima reminder WhatsApp',
    expired: 'Pasien tidak merespon dalam 48 jam setelah pesan dikirim'
  }
  return descriptions[status] || 'Status verifikasi tidak dikenal'
}