'use client'

import { getPatientDisplayStatus } from '@/lib/patient-status'

type VerificationStatus = 'pending_verification' | 'verified' | 'declined' | 'expired' | 'unsubscribed'

interface VerificationBadgeProps {
  status: VerificationStatus
  size?: 'small' | 'large'
  className?: string
  // For BERHENTI detection
  isActive?: boolean
  patient?: any // Full patient object for better status detection
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