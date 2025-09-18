'use client'

// Patient status utilities temporarily inlined



interface PatientStatusInput {
  verificationStatus: string
  isActive?: boolean
}

interface PatientDisplayStatus {
  badgeColor: string
  badgeIcon: string
  displayStatus: string
  description: string
}

function getPatientDisplayStatus(input: PatientStatusInput): PatientDisplayStatus {
  // Normalize verification status to handle case mismatch between database (UPPERCASE) and UI expectations (lowercase)
  const normalizedStatus = input.verificationStatus?.toLowerCase()
  const isActive = input.isActive ?? true

  if (!isActive) {
    return {
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
      badgeIcon: '⏹️',
      displayStatus: 'BERHENTI',
      description: 'Pasien telah berhenti dari layanan'
    }
  }

  // Handle different status formats and special mappings:
  // Database: VERIFIED, PENDING, DECLINED, EXPIRED (uppercase)
  // UI expects: verified, pending_verification, declined, expired, unsubscribed (lowercase)
  let mappedStatus = normalizedStatus
  
  // Map database enum values to UI expected values
  switch (normalizedStatus) {
    case 'pending':
      mappedStatus = 'pending_verification'
      break
    // Add other mappings as needed
    default:
      mappedStatus = normalizedStatus
  }

  switch (mappedStatus) {
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
    case 'unsubscribed':
      return {
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
        badgeIcon: '🚫',
        displayStatus: 'Berhenti',
        description: 'Pasien telah berhenti dari layanan'
      }
    default:
      // Add debug info to help identify unmapped statuses
      console.warn('Unmapped verification status:', input.verificationStatus, '(normalized:', normalizedStatus, ')')
      return {
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
        badgeIcon: '❓',
        displayStatus: 'Status Tidak Dikenal',
        description: `Status tidak dikenal: ${input.verificationStatus}`
      }
  }
}

interface PatientObject {
  verificationStatus: string
  isActive?: boolean
  [key: string]: unknown
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
    ? getPatientDisplayStatus({ verificationStatus: patient.verificationStatus, isActive: patient.isActive })
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
    'Berhenti': 'Berhenti dari Layanan',
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

