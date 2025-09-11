// Patient domain shared type definitions and error classes

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { patients, patientVariables } from '@/db'

// DB types
export type PatientRow = InferSelectModel<typeof patients>
export type PatientVariableRow = InferSelectModel<typeof patientVariables>
export type NewPatientVariableRow = InferInsertModel<typeof patientVariables>

// Variables DTOs
export interface PatientVariablesListItem {
  id: string
  variableName: string
  variableValue: string
  createdAt: Date
  updatedAt: Date
}

export interface PatientVariablesResponse {
  success: boolean
  patientId: string
  variables: Record<string, string>
  variablesList: PatientVariablesListItem[]
  count: number
}

// Create / Update Patient DTOs
export interface CreatePatientDTO {
  name: string
  phoneNumber: string
  address?: string
  birthDate?: string | null
  diagnosisDate?: string | null
  cancerStage?: 'I' | 'II' | 'III' | 'IV' | null
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  photoUrl?: string
  assignedVolunteerId?: string | null
}

export interface UpdatePatientDTO {
  name?: string
  phoneNumber?: string
  address?: string | null
  birthDate?: string | null
  diagnosisDate?: string | null
  cancerStage?: 'I' | 'II' | 'III' | 'IV' | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  notes?: string | null
  isActive?: boolean
  photoUrl?: string | null
}

// Health Notes DTOs
export interface HealthNoteDTO {
  id: string
  patientId: string
  note: string
  noteDate: Date
  recordedBy: string
  createdAt: Date
  updatedAt: Date
  recordedByUser: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

export interface CreateHealthNoteDTO {
  note: string
  noteDate: string // ISO string from client
}

export interface UpdateHealthNoteDTO {
  note: string
  noteDate: string
}

// Filters
export interface PatientFilters {
  includeDeleted?: boolean
  status?: 'active' | 'inactive' | 'all'
  assignedVolunteerId?: string
  search?: string
  page?: number
  limit?: number
  orderBy?: 'createdAt' | 'name'
  orderDirection?: 'asc' | 'desc'
}

// Error classes for consistent API
export class PatientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'PatientError'
  }
}

export class ValidationError extends PatientError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends PatientError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends PatientError {
  constructor(message: string, details?: any) {
    super(message, 'UNAUTHORIZED', 401, details)
    this.name = 'UnauthorizedError'
  }
}


