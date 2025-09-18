// Patient domain shared type definitions and error classes

import { InferSelectModel } from 'drizzle-orm'
import { patients } from '@/db'

// DB types
export type PatientRow = InferSelectModel<typeof patients>



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
  doctorName?: string | null
  hospitalName?: string | null
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
    public details?: unknown
  ) {
    super(message)
    this.name = 'PatientError'
  }
}

export class ValidationError extends PatientError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends PatientError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends PatientError {
  constructor(message: string, details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details)
    this.name = 'UnauthorizedError'
  }
}


