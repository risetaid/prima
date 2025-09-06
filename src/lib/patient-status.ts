// Helper functions for patient status display and logic

export interface PatientStatusInfo {
  displayStatus: string
  badgeColor: string
  badgeIcon: string
  description: string
  actionable: boolean
}

export function getPatientDisplayStatus(patient: {verificationStatus?: string; isActive?: boolean; lastVerificationResponse?: string | null; lastVerificationAt?: Date | null}): PatientStatusInfo {
  // Priority order: BERHENTI > Verified > Declined > Pending > Expired > Unknown
  
  // BERHENTI: Unsubscribed patients (declined + inactive)
  if (patient.verificationStatus === 'declined' && !patient.isActive) {
    return {
      displayStatus: 'BERHENTI',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      badgeIcon: '❌',
      description: 'Pasien telah mengirim pesan BERHENTI dan tidak menerima reminder',
      actionable: true // Can be reactivated
    }
  }
  
  // Verified: Successfully verified and active
  if (patient.verificationStatus === 'verified' && patient.isActive) {
    return {
      displayStatus: 'Terverifikasi',
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
      badgeIcon: '✅',
      description: 'Pasien sudah terverifikasi dan menerima reminder otomatis',
      actionable: false // Already verified
    }
  }
  
  // Declined: Genuine declined verification (but still active)
  if (patient.verificationStatus === 'declined' && patient.isActive) {
    return {
      displayStatus: 'Menolak',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      badgeIcon: '❌',
      description: 'Pasien menolak untuk menerima reminder WhatsApp',
      actionable: true // Can retry verification
    }
  }
  
  // Expired: Verification expired
  if (patient.verificationStatus === 'expired') {
    return {
      displayStatus: 'Kedaluwarsa',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      badgeIcon: '⏰',
      description: 'Batas waktu verifikasi telah habis',
      actionable: true // Can resend verification
    }
  }
  
  // Pending: Awaiting verification
  if (patient.verificationStatus === 'pending_verification' || !patient.verificationStatus) {
    return {
      displayStatus: 'Menunggu Verifikasi',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeIcon: '⏳',
      description: 'Menunggu respons verifikasi dari pasien via WhatsApp',
      actionable: true // Can send verification
    }
  }
  
  // Unknown/fallback
  return {
    displayStatus: 'Status Tidak Dikenal',
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeIcon: '❓',
    description: 'Status verifikasi tidak dapat ditentukan',
    actionable: true // Allow manual intervention
  }
}

export function getVerificationStatusText(verificationStatus: string, isActive: boolean): string {
  // For backward compatibility with existing components
  const statusInfo = getPatientDisplayStatus({ verificationStatus, isActive })
  return statusInfo.displayStatus
}

export function getVerificationBadgeClass(verificationStatus: string, isActive: boolean): string {
  // For backward compatibility with existing components
  const statusInfo = getPatientDisplayStatus({ verificationStatus, isActive })
  return statusInfo.badgeColor
}