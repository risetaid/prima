'use client'

// Patient status utilities temporarily inlined

type VerificationStatus = 'pending_verification' | 'verified' | 'declined' | 'expired' | 'unsubscribed'

interface PatientStatusInput {
  verificationStatus?: string
  isActive?: boolean
}

interface PatientDisplayStatus {
  badgeColor: string
  badgeIcon: string
  displayStatus: string
  description: string
}

function getPatientDisplayStatus(input: PatientStatusInput): PatientDisplayStatus {
  const verificationStatus = input.verificationStatus
  const isActive = input.isActive ?? true

  if (!isActive) {
    return {
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
      badgeIcon: '⏹️',
      displayStatus: 'BERHENTI',
      description: 'Pasien telah berhenti dari layanan'
    }
  }

  switch (verificationStatus) {
    case 'verified':
      return {
        badgeColor: 'bg-green-100 text-green-800 border-green-300',
        badgeIcon: '✅',
        displayStatus: 'Terverifikasi',
        description: 'Pasien telah diverifikasi'
      }
    case 'declined':
      return {
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        badgeIcon: '❌',
        displayStatus: 'Menolak',
        description: 'Pasien menolak verifikasi'
      }
    case 'expired':
      return {
        badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        badgeIcon: '⏰',
        displayStatus: 'Kedaluwarsa',
        description: 'Verifikasi kedaluwarsa'
      }
    case 'pending_verification':
      return {
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        badgeIcon: '⏳',
        displayStatus: 'Menunggu Verifikasi',
        description: 'Menunggu verifikasi'
      }
    default:
      return {
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
        badgeIcon: '❓',
        displayStatus: 'Tidak Dikenal',
        description: 'Status tidak dikenal'
      }
  }
}

interface PatientObject {
  verificationStatus?: string
  isActive?: boolean
  [key: string]: any
}

interface VerificationBadgeProps {
  status: string
  size?: 'small' | 'large'
  className?: string
  // For BERHENTI detection
  isActive?: boolean
  patient?: PatientObject // Full patient object for better status detection
}

export default function VerificationBadge({ 
  status, 
  size = 'small', 
  className = '',
  isActive = true,
  patient
}: VerificationBadgeProps) {
  // Use new centralized status logic
  const statusInfo = patient 
    ? getPatientDisplayStatus(patient)
    : getPatientDisplayStatus({ verificationStatus: status, isActive })

  const sizeClasses = size === 'large' 
    ? 'px-4 py-2 text-sm font-semibold' 
    : 'px-2.5 py-0.5 text-xs font-medium'

  return (
    <span 
      className={`inline-flex items-center rounded-full border ${statusInfo.badgeColor} ${sizeClasses} ${className}`}
    >
      <span className="mr-1">{statusInfo.badgeIcon}</span>
      {statusInfo.displayStatus}
    </span>
  )
}

export function getVerificationStatusTitle(status: string, isActive: boolean = true): string {
  const statusInfo = getPatientDisplayStatus({ verificationStatus: status, isActive })
  
  // Map display status to detailed titles
  const titleMap: Record<string, string> = {
    'BERHENTI': 'Berhenti dari Layanan',
    'Terverifikasi': 'Telah Disetujui',
    'Menolak': 'Ditolak Pasien',
    'Kedaluwarsa': 'Tidak Ada Respon',
    'Menunggu Verifikasi': 'Menunggu Persetujuan'
  }
  
  return titleMap[statusInfo.displayStatus] || 'Status Tidak Dikenal'
}

export function getVerificationStatusDescription(status: string, isActive: boolean = true): string {
  const statusInfo = getPatientDisplayStatus({ verificationStatus: status, isActive })
  return statusInfo.description
}