/**
 * PRIMA Medical Component Library - Centralized Exports
 * 
 * This index file provides a single entry point for all medical components,
 * making it easy to import and use throughout the application.
 * 
 * ELIMINATES IMPORT COMPLEXITY:
 * - Single source for all medical UI components
 * - Consistent naming conventions
 * - Easy to maintain and extend
 */

// Patient Components
export { PatientCard, PatientAvatar, MedicalStatus } from './PatientCard'
export type { PatientCardProps, PatientCardVariant, PatientCardAction } from './PatientCard'

// Data Table Components  
export { MedicalDataTable, PatientsTable } from './MedicalDataTable'
export type { 
  TableColumn, 
  TableAction, 
  MedicalDataTableProps,
  TableVariant 
} from './MedicalDataTable'

// Utility functions
export { 
  getComplianceStatus,
  getPatientStatus, 
  getPatientInitials,
  getAvatarColor,
  formatPhoneNumber
} from './PatientCard'

// Re-export types for convenience
export type { PatientWithVolunteer, ComplianceData, PatientFilters } from '@/lib/medical-queries'