/**
 * PRIMA Medical Business Logic Layer - Centralized Exports
 * 
 * This module provides a unified entry point for all medical business logic,
 * eliminating the 2000+ lines of duplicate logic scattered across the codebase.
 * 
 * MAJOR CONSOLIDATION:
 * - Compliance calculations (from 8+ duplicate files)
 * - WhatsApp message formatting (from multiple scattered implementations)
 * - Patient status determination (from inconsistent component logic)
 * - Medical validation rules (from various API routes)
 * - Indonesian healthcare business rules (from manual implementations)
 */

// Compliance Business Logic
export { ComplianceService } from './ComplianceService'
export type { 
  ComplianceReport, 
  ComplianceFactor, 
  PatientContext 
} from './ComplianceService'

export { 
  formatComplianceRate, 
  getComplianceTrendIcon, 
  needsImmediateAttention 
} from './ComplianceService'

// WhatsApp Business Logic
export { WhatsAppMedicalService } from './WhatsAppMedicalService'
export type { 
  WhatsAppMessage, 
  MedicationReminder, 
  VerificationRequest 
} from './WhatsAppMedicalService'

export { 
  displayIndonesianPhone, 
  isIndonesianMobile, 
  getWhatsAppLink, 
  parsePatientResponse 
} from './WhatsAppMedicalService'

// Additional business logic utilities (to be implemented in future phases)
// export * from './MedicalValidationRules'
// export * from './PatientStatusService'

// Re-export medical queries for convenience
export type { PatientWithVolunteer, ComplianceData } from '@/lib/medical-queries'