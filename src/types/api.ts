/**
 * Shared API Types for PRIMA Medical System
 * 
 * This file contains type definitions that are shared between:
 * - Client-side components
 * - API routes
 * - Services and utilities
 * 
 * Benefits:
 * - Single source of truth for types
 * - No duplication between client/server
 * - Better type safety and autocomplete
 * - Easier refactoring
 */

// ===== BASE TYPES =====

export type UserRole = 'ADMIN' | 'DEVELOPER' | 'RELAWAN';

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'DECLINED' | 'EXPIRED';

export type CancerStage = 'I' | 'II' | 'III' | 'IV';

export type ReminderStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'MISSED' | 'DECLINED';

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ContentCategory = 'GENERAL' | 'NUTRITION' | 'EXERCISE' | 'MOTIVATIONAL' | 'MEDICAL' | 'FAQ';

export type ContentType = 'article' | 'video';

// ===== USER TYPES =====

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  deletedAt: Date | null;
}

export type CreateUserDTO = Pick<User, 'email' | 'firstName' | 'lastName'> & {
  role?: UserRole;
};

export type UpdateUserDTO = Partial<Pick<User, 'firstName' | 'lastName' | 'role' | 'isActive' | 'isApproved'>>;

// ===== PATIENT TYPES =====

export interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  address: string | null;
  birthDate: Date | null;
  diagnosisDate: Date | null;
  cancerStage: CancerStage | null;
  doctorName: string | null;
  hospitalName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  photoUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationSentAt: Date | null;
  verificationToken: string | null;
  isActive: boolean;
  assignedVolunteerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreatePatientDTO = Pick<Patient, 'name' | 'phoneNumber'> & 
  Partial<Pick<Patient, 
    'address' | 
    'birthDate' | 
    'diagnosisDate' | 
    'cancerStage' | 
    'doctorName' | 
    'hospitalName' |
    'emergencyContactName' | 
    'emergencyContactPhone' | 
    'notes' | 
    'photoUrl' |
    'assignedVolunteerId'
  >>;

export type UpdatePatientDTO = Partial<Omit<CreatePatientDTO, 'id'>> & {
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
};

// ===== REMINDER TYPES =====

export interface Reminder {
  id: string;
  patientId: string;
  reminderType: string;
  scheduledTime: string;
  message: string | null;
  title: string | null;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  status: ReminderStatus;
  confirmationStatus: ConfirmationStatus | null;
  confirmationResponse: string | null;
  confirmationResponseAt: Date | null;
  confirmationSentAt: Date | null;
  sentAt: Date | null;
  fonnteMessageId: string | null;
  priority: number | null;
  metadata: Record<string, unknown> | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CustomRecurrence {
  frequency: 'day' | 'week' | 'month';
  interval: number;
  daysOfWeek?: string[];
  daysOfMonth?: number[];
  endType: 'never' | 'on' | 'after';
  endDate?: string;
  occurrences?: number;
}

export interface AttachedContent {
  id: string;
  type: 'article' | 'video' | 'ARTICLE' | 'VIDEO';
  title: string;
  slug?: string;
  url?: string;
}

export type CreateReminderDTO = {
  message: string;
  time: string;
  selectedDates?: string[];
  customRecurrence?: CustomRecurrence;
  attachedContent?: AttachedContent[];
};

export type UpdateReminderDTO = Partial<Pick<Reminder, 'message' | 'scheduledTime' | 'isActive'>>;

// ===== CMS CONTENT TYPES =====

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  category: ContentCategory;
  tags: string[];
  status: ContentStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  description: string | null;
  category: ContentCategory;
  tags: string[];
  status: ContentStatus;
  durationMinutes: number | null;
  featured: boolean;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreateArticleDTO = Pick<Article, 'title' | 'slug' | 'content'> & 
  Partial<Pick<Article, 'excerpt' | 'featuredImageUrl' | 'category' | 'tags' | 'status' | 'seoTitle' | 'seoDescription'>>;

export type UpdateArticleDTO = Partial<CreateArticleDTO>;

export type CreateVideoDTO = Pick<Video, 'title' | 'slug' | 'videoUrl'> & 
  Partial<Pick<Video, 'thumbnailUrl' | 'description' | 'category' | 'tags' | 'status' | 'durationMinutes' | 'featured'>>;

export type UpdateVideoDTO = Partial<CreateVideoDTO>;

// ===== TEMPLATE TYPES =====

export interface Template {
  id: string;
  name: string;
  message: string;
  type: 'REMINDER' | 'FOLLOW_UP' | 'NOTIFICATION';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTemplateDTO = Pick<Template, 'name' | 'message'> & 
  Partial<Pick<Template, 'type' | 'isActive'>>;

export type UpdateTemplateDTO = Partial<CreateTemplateDTO>;

// ===== PAGINATION TYPES =====

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ===== FILTER TYPES =====

export interface PatientFilters extends PaginationParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  includeDeleted?: boolean;
  assignedVolunteerId?: string;
}

export interface ReminderFilters extends PaginationParams {
  filter?: 'all' | 'completed' | 'pending' | 'scheduled';
  date?: string;
  includeDeleted?: boolean;
  patientId?: string;
}

export interface ContentFilters extends PaginationParams {
  search?: string;
  category?: ContentCategory;
  status?: ContentStatus;
}

// ===== COMPLIANCE & STATS TYPES =====

export interface ComplianceRate {
  total: number;
  completed: number;
  missed: number;
  rate: number;
}

export interface PatientWithCompliance extends Patient {
  complianceRate: ComplianceRate;
  reminderCount: number;
  lastReminderDate: Date | null;
}

export interface ReminderStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  confirmed: number;
  missed: number;
  failed: number;
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  verifiedPatients: number;
  totalReminders: number;
  todayReminders: number;
  averageCompliance: number;
}

// ===== FORM TYPES =====

// Used by client components for form handling
export interface PatientFormData {
  name: string;
  phoneNumber: string;
  address: string;
  birthDate: string;
  diagnosisDate: string;
  cancerStage: '' | CancerStage;
  doctorName: string;
  hospitalName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

export interface ReminderFormData {
  message: string;
  time: string;
  selectedDates: string[];
  customRecurrence: CustomRecurrence & { enabled: boolean };
}

// ===== HELPER TYPES =====

// For mapping between different formats
export type DateString = string; // ISO 8601 format
export type TimeString = string; // HH:MM format

// For optional ID parameters
export type WithId<T> = T & { id: string };
export type WithoutId<T> = Omit<T, 'id'>;

// For partial updates
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// For selecting specific fields
export type SelectFields<T, K extends keyof T> = Pick<T, K>;
