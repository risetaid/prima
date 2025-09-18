# PRIMA Database Schema v2.0 - Clean & Focused

## Overview

This document outlines a streamlined database schema for the PRIMA (Palliative Remote Integrated Monitoring and Assistance) system, reducing complexity from 31+ tables to 12 essential tables.

## Schema Architecture

### Core System (4 tables)

#### 1. users

Healthcare volunteers and administrators

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'RELAWAN', -- SUPERADMIN, ADMIN, RELAWAN
  hospital_name text,
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES users(id),
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);
```

#### 2. patients

Cancer patients under care

```sql
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text NOT NULL,
  address text,
  birth_date timestamp with time zone,
  diagnosis_date timestamp with time zone,
  cancer_stage text CHECK (cancer_stage IN ('I', 'II', 'III', 'IV')),
  assigned_volunteer_id uuid REFERENCES users(id),
  doctor_name text,
  hospital_name text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  -- Verification fields
  verification_status text NOT NULL DEFAULT 'pending_verification',
  verification_sent_at timestamp with time zone,
  verification_response_at timestamp with time zone,
  verification_message text,
  verification_attempts text DEFAULT '0',
  verification_expires_at timestamp with time zone,

  -- Unsubscribe tracking
  unsubscribed_at timestamp with time zone,
  unsubscribe_reason text,
  unsubscribe_method text,
  last_reactivated_at timestamp with time zone,

  -- Photo
  photo_url text
);
```

#### 3. verification_logs

WhatsApp verification tracking

```sql
CREATE TABLE verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'sent', 'responded', 'manual_verified', 'expired', 'reactivated'
  message_sent text,
  patient_response text,
  verification_result text,
  processed_by uuid REFERENCES users(id),
  additional_info jsonb, -- Store LLM analysis results and metadata
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

#### 4. audit_logs

Security and compliance audit trail

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL, -- 'create', 'update', 'delete', 'login', 'export'
  resource_type text NOT NULL, -- 'patient', 'user', 'reminder'
  resource_id uuid,
  user_id uuid NOT NULL REFERENCES users(id),
  patient_id uuid REFERENCES patients(id), -- For patient-related actions
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);
```

### Patient Care (4 tables)

#### 5. health_notes

Medical notes from volunteer visits

```sql
CREATE TABLE health_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  note text NOT NULL,
  note_date timestamp with time zone NOT NULL,
  recorded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);
```

#### 6. patient_variables

Custom patient data fields

```sql
CREATE TABLE patient_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  variable_name text NOT NULL, -- 'obat', 'dosis', 'nama_keluarga', etc.
  variable_value text NOT NULL,
  variable_category text NOT NULL DEFAULT 'PERSONAL', -- 'PERSONAL', 'MEDICAL', 'MEDICATION', 'CAREGIVER'
  variable_metadata jsonb, -- Additional structured data
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_id uuid NOT NULL REFERENCES users(id),
  deleted_at timestamp with time zone
);
```

#### 7. manual_confirmations

Volunteer visit confirmations

```sql
CREATE TABLE manual_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES users(id),
  reminder_schedule_id uuid REFERENCES reminder_schedules(id),
  reminder_log_id uuid REFERENCES reminder_logs(id),
  visit_date date NOT NULL,
  visit_time time,
  patient_condition text, -- 'baik', 'sakit_ringan', 'sakit_berat', 'meninggal'
  notes text,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now()
);
```

#### 8. reminder_logs

WhatsApp reminder delivery tracking

```sql
CREATE TABLE reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_schedule_id uuid NOT NULL REFERENCES reminder_schedules(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  message text NOT NULL,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'confirmed'
  confirmation_status text DEFAULT 'pending', -- 'pending', 'confirmed', 'declined'
  confirmation_response text, -- Patient's response: 'SUDAH', 'BELUM', 'BESOK'
  medications_taken text[], -- Array of medication names taken
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### Reminder System (2 tables)

#### 9. reminder_schedules

Medication reminder configurations

```sql
CREATE TABLE reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL DEFAULT 'once_daily', -- 'once_daily', 'twice_daily', 'custom'
  scheduled_time time NOT NULL,
  custom_message text,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);
```

#### 10. reminder_content_attachments

Links reminders to educational content

```sql
CREATE TABLE reminder_content_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_schedule_id uuid NOT NULL REFERENCES reminder_schedules(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- 'article', 'video'
  content_id text NOT NULL, -- cms_articles.id or cms_videos.id
  attached_at timestamp with time zone NOT NULL DEFAULT now(),
  attached_by uuid NOT NULL REFERENCES users(id)
);
```

### Content Management (2 tables)

#### 11. cms_articles

Educational articles

```sql
CREATE TABLE cms_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  category text NOT NULL DEFAULT 'general',
  tags text[],
  featured_image_url text,
  author_id uuid REFERENCES users(id),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);
```

#### 12. cms_videos

YouTube educational videos

```sql
CREATE TABLE cms_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_video_id text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'general',
  tags text[],
  duration_seconds integer,
  thumbnail_url text,
  author_id uuid REFERENCES users(id),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);
```

## Indexes

```sql
-- Core indexes for performance
CREATE INDEX idx_patients_assigned_volunteer ON patients(assigned_volunteer_id);
CREATE INDEX idx_patients_verification_status ON patients(verification_status);
CREATE INDEX idx_patients_is_active ON patients(is_active);
CREATE INDEX idx_patients_phone_number ON patients(phone_number);

CREATE INDEX idx_verification_logs_patient ON verification_logs(patient_id);
CREATE INDEX idx_verification_logs_created_at ON verification_logs(created_at);

CREATE INDEX idx_reminder_schedules_patient ON reminder_schedules(patient_id);
CREATE INDEX idx_reminder_schedules_active ON reminder_schedules(is_active);

CREATE INDEX idx_reminder_logs_patient ON reminder_logs(patient_id);
CREATE INDEX idx_reminder_logs_status ON reminder_logs(status);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);

CREATE INDEX idx_health_notes_patient ON health_notes(patient_id);
CREATE INDEX idx_health_notes_date ON health_notes(note_date);

CREATE INDEX idx_patient_variables_patient ON patient_variables(patient_id);
CREATE INDEX idx_patient_variables_category ON patient_variables(variable_category);

-- Composite indexes for common queries
CREATE INDEX idx_patients_volunteer_active ON patients(assigned_volunteer_id, is_active);
CREATE INDEX idx_patients_status_active ON patients(verification_status, is_active);
CREATE INDEX idx_reminder_logs_patient_status ON reminder_logs(patient_id, status);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
```

## Migration Strategy

### Phase 1: Data Backup

```sql
-- Backup critical data before migration
CREATE TABLE patients_backup AS SELECT * FROM patients;
CREATE TABLE reminder_schedules_backup AS SELECT * FROM reminder_schedules;
CREATE TABLE users_backup AS SELECT * FROM users;
```

### Phase 2: Schema Recreation

1. Drop all existing tables (except backups)
2. Create new clean schema
3. Run initial migration

### Phase 3: Data Migration

1. Migrate users table (all data preserved)
2. Migrate patients table (critical fields only)
3. Migrate reminder_schedules (active schedules only)
4. Rebuild verification_logs from existing data
5. Migrate health_notes and patient_variables

### Phase 4: Validation

1. Verify all foreign key relationships
2. Test core API endpoints
3. Validate data integrity
4. Performance testing

## Benefits

- **Reduced Complexity**: 12 tables vs 31+ tables
- **Clear Separation**: Logical grouping of functionality
- **Better Performance**: Fewer joins, simpler queries
- **Easier Maintenance**: Focused scope, clear relationships
- **Future-Proof**: Easy to extend without complexity

## Implementation Notes

- All tables include `created_at`, `updated_at`, `deleted_at` for consistency
- Soft deletes implemented across all entities
- UUID primary keys for scalability
- JSONB fields for flexible metadata storage
- Comprehensive indexing for query performance
- Foreign key constraints for data integrity
