-- PRIMA Database Reset and Recreation Script
-- Complete schema for WhatsApp-based patient management system

-- Step 1: Drop all existing tables in correct order
DROP TABLE IF EXISTS reminder_content_attachments CASCADE;
DROP TABLE IF EXISTS reminder_followups CASCADE;
DROP TABLE IF EXISTS manual_confirmations CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS reminder_logs CASCADE;
DROP TABLE IF EXISTS reminder_schedules CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS medication_administration_logs CASCADE;
DROP TABLE IF EXISTS cms_articles CASCADE;
DROP TABLE IF EXISTS cms_videos CASCADE;
DROP TABLE IF EXISTS llm_response_cache CASCADE;
DROP TABLE IF EXISTS volunteer_notifications CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS conversation_states CASCADE;
DROP TABLE IF EXISTS verification_logs CASCADE;
DROP TABLE IF EXISTS health_notes CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS patient_variables CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS llm_prompt_metrics CASCADE;
DROP TABLE IF EXISTS llm_prompt_test_results CASCADE;
DROP TABLE IF EXISTS llm_prompt_test_variants CASCADE;
DROP TABLE IF EXISTS llm_prompt_tests CASCADE;
DROP TABLE IF EXISTS llm_prompt_templates CASCADE;
DROP TABLE IF EXISTS system_health_metrics CASCADE;
DROP TABLE IF EXISTS data_access_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS cohort_analysis CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Drop existing enum types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS cancer_stage CASCADE;
DROP TYPE IF EXISTS medical_record_type CASCADE;
DROP TYPE IF EXISTS frequency CASCADE;
DROP TYPE IF EXISTS reminder_status CASCADE;
DROP TYPE IF EXISTS confirmation_status CASCADE;
DROP TYPE IF EXISTS patient_condition CASCADE;
DROP TYPE IF EXISTS template_category CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS content_category CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;
DROP TYPE IF EXISTS followup_status CASCADE;
DROP TYPE IF EXISTS followup_type CASCADE;
DROP TYPE IF EXISTS medication_category CASCADE;
DROP TYPE IF EXISTS medication_form CASCADE;
DROP TYPE IF EXISTS medication_frequency CASCADE;
DROP TYPE IF EXISTS medication_timing CASCADE;
DROP TYPE IF EXISTS medication_unit CASCADE;

-- Step 3: Create all custom enums
CREATE TYPE user_role AS ENUM ('DEVELOPER', 'ADMIN', 'RELAWAN');
CREATE TYPE cancer_stage AS ENUM ('I', 'II', 'III', 'IV');
CREATE TYPE medical_record_type AS ENUM ('DIAGNOSIS', 'TREATMENT', 'PROGRESS', 'HEALTH_NOTE');
CREATE TYPE frequency AS ENUM ('CUSTOM', 'CUSTOM_RECURRENCE');
CREATE TYPE reminder_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');
CREATE TYPE confirmation_status AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'MISSED', 'UNKNOWN');
CREATE TYPE patient_condition AS ENUM ('GOOD', 'FAIR', 'POOR');
CREATE TYPE template_category AS ENUM ('REMINDER', 'APPOINTMENT', 'EDUCATIONAL');
CREATE TYPE verification_status AS ENUM ('pending_verification', 'verified', 'declined', 'expired', 'unsubscribed');
CREATE TYPE content_category AS ENUM ('general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE followup_status AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'COMPLETED', 'CANCELLED', 'ESCALATED', 'NEEDS_ATTENTION', 'RESPONDED');
CREATE TYPE followup_type AS ENUM ('REMINDER_CONFIRMATION', 'MEDICATION_COMPLIANCE', 'SYMPTOM_CHECK', 'GENERAL_WELLBEING');
CREATE TYPE medication_category AS ENUM ('CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'HORMONAL_THERAPY', 'PAIN_MANAGEMENT', 'ANTIEMETIC', 'ANTIBIOTIC', 'ANTIVIRAL', 'ANTIFUNGAL', 'SUPPLEMENT', 'OTHER');
CREATE TYPE medication_form AS ENUM ('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'INFUSION', 'CREAM', 'PATCH', 'INHALER', 'SPRAY', 'OTHER');
CREATE TYPE medication_frequency AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'EVERY_24_HOURS', 'EVERY_WEEK', 'EVERY_MONTH', 'AS_NEEDED', 'CUSTOM');
CREATE TYPE medication_timing AS ENUM ('BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'BEDTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME');
CREATE TYPE medication_unit AS ENUM ('MG', 'G', 'ML', 'MCG', 'IU', 'TABLET', 'CAPSULE', 'DOSE', 'PUFF', 'DROP', 'PATCH', 'OTHER');

-- Step 4: Create core tables

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    hospital_name TEXT,
    role user_role NOT NULL DEFAULT 'RELAWAN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    clerk_id TEXT NOT NULL UNIQUE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for users
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_is_active_idx ON users(is_active);
CREATE INDEX users_is_approved_idx ON users(is_approved);
CREATE INDEX users_role_active_approved_idx ON users(role, is_active, is_approved);
CREATE INDEX users_clerk_approved_active_idx ON users(clerk_id, is_approved, is_active);
CREATE INDEX users_last_login_idx ON users(last_login_at);
CREATE INDEX users_deleted_at_idx ON users(deleted_at);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT,
    birth_date TIMESTAMP WITH TIME ZONE,
    diagnosis_date TIMESTAMP WITH TIME ZONE,
    cancer_stage cancer_stage,
    assigned_volunteer_id UUID REFERENCES users(id),
    doctor_name TEXT,
    hospital_name TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    photo_url TEXT,
    verification_status verification_status NOT NULL DEFAULT 'pending_verification',
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    verification_response_at TIMESTAMP WITH TIME ZONE,
    verification_message TEXT,
    verification_attempts TEXT DEFAULT '0',
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    last_reactivated_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_reason TEXT,
    unsubscribe_method TEXT CHECK (unsubscribe_method IN ('manual', 'llm_analysis', 'keyword_detection', 'api'))
);

-- Indexes for patients
CREATE INDEX patients_is_active_idx ON patients(is_active);
CREATE INDEX patients_assigned_volunteer_idx ON patients(assigned_volunteer_id);
CREATE INDEX patients_assigned_volunteer_active_idx ON patients(assigned_volunteer_id, is_active);
CREATE INDEX patients_phone_number_idx ON patients(phone_number);
CREATE INDEX patients_created_at_idx ON patients(created_at);
CREATE INDEX patients_verification_status_idx ON patients(verification_status);
CREATE INDEX patients_verification_status_active_idx ON patients(verification_status, is_active);
CREATE INDEX patients_deleted_at_idx ON patients(deleted_at);
CREATE INDEX patients_deleted_active_idx ON patients(deleted_at, is_active);
CREATE INDEX patients_deleted_active_name_idx ON patients(deleted_at, is_active, name);
CREATE INDEX patients_assigned_deleted_active_idx ON patients(assigned_volunteer_id, deleted_at, is_active);

-- Medical records table
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    record_type medical_record_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recorded_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for medical records
CREATE INDEX medical_records_patient_id_idx ON medical_records(patient_id);
CREATE INDEX medical_records_record_type_idx ON medical_records(record_type);
CREATE INDEX medical_records_recorded_date_idx ON medical_records(recorded_date);
CREATE INDEX medical_records_recorded_by_idx ON medical_records(recorded_by);
CREATE INDEX medical_records_patient_recorded_date_idx ON medical_records(patient_id, recorded_date);

-- Health notes table
CREATE TABLE health_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    note TEXT NOT NULL,
    note_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for health notes
CREATE INDEX health_notes_patient_id_idx ON health_notes(patient_id);
CREATE INDEX health_notes_patient_note_date_idx ON health_notes(patient_id, note_date);
CREATE INDEX health_notes_recorded_by_idx ON health_notes(recorded_by);
CREATE INDEX health_notes_deleted_at_idx ON health_notes(deleted_at);

-- Patient variables table
CREATE TABLE patient_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    variable_name TEXT NOT NULL,
    variable_value TEXT NOT NULL,
    variable_category TEXT NOT NULL DEFAULT 'PERSONAL' CHECK (variable_category IN ('PERSONAL', 'MEDICAL', 'MEDICATION', 'CAREGIVER', 'HOSPITAL', 'OTHER')),
    variable_metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for patient variables
CREATE INDEX patient_variables_patient_idx ON patient_variables(patient_id);
CREATE INDEX patient_variables_name_idx ON patient_variables(patient_id, variable_name);
CREATE INDEX patient_variables_patient_active_idx ON patient_variables(patient_id, is_active);
CREATE INDEX patient_variables_deleted_at_idx ON patient_variables(deleted_at);
CREATE INDEX patient_variables_category_idx ON patient_variables(variable_category);
CREATE INDEX patient_variables_patient_category_idx ON patient_variables(patient_id, variable_category);
CREATE INDEX patient_variables_patient_category_active_idx ON patient_variables(patient_id, variable_category, is_active);
CREATE INDEX patient_variables_name_category_idx ON patient_variables(variable_name, variable_category);

-- Conversation states table
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    phone_number TEXT NOT NULL,
    current_context TEXT NOT NULL,
    expected_response_type TEXT,
    related_entity_id UUID,
    related_entity_type TEXT,
    state_data JSONB,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for conversation states
CREATE INDEX conversation_states_patient_id_idx ON conversation_states(patient_id);
CREATE INDEX conversation_states_phone_number_idx ON conversation_states(phone_number);
CREATE INDEX conversation_states_current_context_idx ON conversation_states(current_context);
CREATE INDEX conversation_states_is_active_idx ON conversation_states(is_active);
CREATE INDEX conversation_states_expires_at_idx ON conversation_states(expires_at);
CREATE INDEX conversation_states_patient_active_idx ON conversation_states(patient_id, is_active);
CREATE INDEX conversation_states_context_active_idx ON conversation_states(current_context, is_active);
CREATE INDEX conversation_states_deleted_at_idx ON conversation_states(deleted_at);
CREATE INDEX conversation_states_patient_context_active_idx ON conversation_states(patient_id, current_context, is_active);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_state_id UUID NOT NULL REFERENCES conversation_states(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL,
    intent TEXT,
    confidence INTEGER,
    processed_at TIMESTAMP WITH TIME ZONE,
    llm_response_id TEXT,
    llm_model TEXT,
    llm_tokens_used INTEGER,
    llm_cost DECIMAL(10, 6),
    llm_response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for conversation messages
CREATE INDEX conversation_messages_conversation_state_id_idx ON conversation_messages(conversation_state_id);
CREATE INDEX conversation_messages_direction_idx ON conversation_messages(direction);
CREATE INDEX conversation_messages_message_type_idx ON conversation_messages(message_type);
CREATE INDEX conversation_messages_created_at_idx ON conversation_messages(created_at);
CREATE INDEX conversation_messages_conversation_direction_idx ON conversation_messages(conversation_state_id, direction);
CREATE INDEX conversation_messages_type_created_idx ON conversation_messages(message_type, created_at);

-- Verification logs table
CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    action TEXT NOT NULL,
    message_sent TEXT,
    patient_response TEXT,
    verification_result verification_status,
    processed_by UUID REFERENCES users(id),
    additional_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for verification logs
CREATE INDEX verification_logs_patient_idx ON verification_logs(patient_id);
CREATE INDEX verification_logs_created_at_idx ON verification_logs(created_at);
CREATE INDEX verification_logs_action_idx ON verification_logs(action);

-- LLM response cache table
CREATE TABLE llm_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_hash TEXT NOT NULL,
    patient_context_hash TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for LLM response cache
CREATE INDEX llm_response_cache_message_hash_idx ON llm_response_cache(message_hash);
CREATE INDEX llm_response_cache_patient_context_hash_idx ON llm_response_cache(patient_context_hash);
CREATE INDEX llm_response_cache_expires_at_idx ON llm_response_cache(expires_at);
CREATE INDEX llm_response_cache_message_patient_unique_idx ON llm_response_cache(message_hash, patient_context_hash);

-- Volunteer notifications table
CREATE TABLE volunteer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('emergency', 'high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'responded', 'resolved', 'dismissed')),
    assigned_volunteer_id UUID REFERENCES users(id),
    escalation_reason TEXT NOT NULL,
    confidence INTEGER,
    intent TEXT,
    patient_context JSONB,
    responded_at TIMESTAMP WITH TIME ZONE,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for volunteer notifications
CREATE INDEX volunteer_notifications_patient_id_idx ON volunteer_notifications(patient_id);
CREATE INDEX volunteer_notifications_priority_idx ON volunteer_notifications(priority);
CREATE INDEX volunteer_notifications_status_idx ON volunteer_notifications(status);
CREATE INDEX volunteer_notifications_assigned_volunteer_idx ON volunteer_notifications(assigned_volunteer_id);
CREATE INDEX volunteer_notifications_escalation_reason_idx ON volunteer_notifications(escalation_reason);
CREATE INDEX volunteer_notifications_created_at_idx ON volunteer_notifications(created_at);
CREATE INDEX volunteer_notifications_status_priority_idx ON volunteer_notifications(status, priority);
CREATE INDEX volunteer_notifications_assigned_status_idx ON volunteer_notifications(assigned_volunteer_id, status);
CREATE INDEX volunteer_notifications_patient_status_idx ON volunteer_notifications(patient_id, status);

-- Step 5: Create reminder tables

-- Reminder schedules table
CREATE TABLE reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_time TEXT NOT NULL,
    frequency frequency NOT NULL DEFAULT 'CUSTOM',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    custom_message TEXT,
    medication_details JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for reminder schedules
CREATE INDEX reminder_schedules_patient_id_idx ON reminder_schedules(patient_id);
CREATE INDEX reminder_schedules_is_active_idx ON reminder_schedules(is_active);
CREATE INDEX reminder_schedules_patient_active_idx ON reminder_schedules(patient_id, is_active);
CREATE INDEX reminder_schedules_start_date_idx ON reminder_schedules(start_date);
CREATE INDEX reminder_schedules_end_date_idx ON reminder_schedules(end_date);
CREATE INDEX reminder_schedules_created_active_idx ON reminder_schedules(created_at, is_active);
CREATE INDEX reminder_schedules_deleted_at_idx ON reminder_schedules(deleted_at);
CREATE INDEX reminder_schedules_active_deleted_start_idx ON reminder_schedules(is_active, deleted_at, start_date);
CREATE INDEX reminder_schedules_start_active_deleted_idx ON reminder_schedules(start_date, is_active, deleted_at);
CREATE INDEX reminder_schedules_today_reminders_idx ON reminder_schedules(start_date, is_active, deleted_at, scheduled_time);

-- Reminder logs table
CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_schedule_id UUID REFERENCES reminder_schedules(id),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status reminder_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fonnte_message_id TEXT,
    confirmation_status confirmation_status DEFAULT 'PENDING',
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_response_at TIMESTAMP WITH TIME ZONE,
    confirmation_message TEXT,
    confirmation_response TEXT
);

-- Indexes for reminder logs
CREATE INDEX reminder_logs_patient_id_idx ON reminder_logs(patient_id);
CREATE INDEX reminder_logs_reminder_schedule_id_idx ON reminder_logs(reminder_schedule_id);
CREATE INDEX reminder_logs_status_idx ON reminder_logs(status);
CREATE INDEX reminder_logs_sent_at_idx ON reminder_logs(sent_at);
CREATE INDEX reminder_logs_patient_status_idx ON reminder_logs(patient_id, status);
CREATE INDEX reminder_logs_sent_status_idx ON reminder_logs(sent_at, status);
CREATE INDEX reminder_logs_delivered_patient_idx ON reminder_logs(status, patient_id);
CREATE INDEX reminder_logs_schedule_status_sent_idx ON reminder_logs(reminder_schedule_id, status, sent_at);
CREATE INDEX reminder_logs_sent_at_patient_idx ON reminder_logs(sent_at, patient_id);
CREATE INDEX reminder_logs_status_sent_at_idx ON reminder_logs(status, sent_at);
CREATE INDEX reminder_logs_confirmation_status_idx ON reminder_logs(confirmation_status);
CREATE INDEX reminder_logs_confirmation_sent_at_idx ON reminder_logs(confirmation_sent_at);

-- Manual confirmations table
CREATE TABLE manual_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    volunteer_id UUID NOT NULL REFERENCES users(id),
    reminder_schedule_id UUID,
    reminder_log_id UUID,
    visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    visit_time TEXT NOT NULL,
    patient_condition patient_condition NOT NULL,
    symptoms_reported TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    follow_up_needed BOOLEAN NOT NULL DEFAULT false,
    follow_up_notes TEXT,
    medications_taken TEXT[] DEFAULT '{}',
    confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for manual confirmations
CREATE INDEX manual_confirmations_patient_id_idx ON manual_confirmations(patient_id);
CREATE INDEX manual_confirmations_volunteer_id_idx ON manual_confirmations(volunteer_id);
CREATE INDEX manual_confirmations_reminder_schedule_id_idx ON manual_confirmations(reminder_schedule_id);
CREATE INDEX manual_confirmations_reminder_log_id_idx ON manual_confirmations(reminder_log_id);
CREATE INDEX manual_confirmations_visit_date_idx ON manual_confirmations(visit_date);
CREATE INDEX manual_confirmations_patient_visit_date_idx ON manual_confirmations(patient_id, visit_date);
CREATE INDEX manual_confirmations_confirmed_patient_idx ON manual_confirmations(confirmed_at, patient_id);
CREATE INDEX manual_confirmations_confirmed_at_idx ON manual_confirmations(confirmed_at);
CREATE INDEX manual_confirmations_patient_confirmed_at_idx ON manual_confirmations(patient_id, confirmed_at);

-- WhatsApp templates table
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    template_text TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    category template_category NOT NULL DEFAULT 'REMINDER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for WhatsApp templates
CREATE INDEX whatsapp_templates_category_idx ON whatsapp_templates(category);
CREATE INDEX whatsapp_templates_is_active_idx ON whatsapp_templates(is_active);
CREATE INDEX whatsapp_templates_category_active_idx ON whatsapp_templates(category, is_active);
CREATE INDEX whatsapp_templates_created_by_idx ON whatsapp_templates(created_by);
CREATE INDEX whatsapp_templates_deleted_at_idx ON whatsapp_templates(deleted_at);

-- Reminder followups table
CREATE TABLE reminder_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_log_id UUID NOT NULL REFERENCES reminder_logs(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    followup_type followup_type NOT NULL DEFAULT 'REMINDER_CONFIRMATION',
    status followup_status NOT NULL DEFAULT 'PENDING',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    message TEXT NOT NULL,
    response TEXT,
    response_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    queue_job_id TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for reminder followups
CREATE INDEX reminder_followups_reminder_log_id_idx ON reminder_followups(reminder_log_id);
CREATE INDEX reminder_followups_patient_id_idx ON reminder_followups(patient_id);
CREATE INDEX reminder_followups_status_idx ON reminder_followups(status);
CREATE INDEX reminder_followups_followup_type_idx ON reminder_followups(followup_type);
CREATE INDEX reminder_followups_scheduled_at_idx ON reminder_followups(scheduled_at);
CREATE INDEX reminder_followups_patient_status_idx ON reminder_followups(patient_id, status);
CREATE INDEX reminder_followups_scheduled_status_idx ON reminder_followups(scheduled_at, status);
CREATE INDEX reminder_followups_pending_scheduled_idx ON reminder_followups(status, scheduled_at);
CREATE INDEX reminder_followups_retry_count_idx ON reminder_followups(retry_count);
CREATE INDEX reminder_followups_sent_at_idx ON reminder_followups(sent_at);
CREATE INDEX reminder_followups_delivered_at_idx ON reminder_followups(delivered_at);
CREATE INDEX reminder_followups_patient_type_status_idx ON reminder_followups(patient_id, followup_type, status);

-- Medication schedules table
CREATE TABLE medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reminder_schedule_id UUID REFERENCES reminder_schedules(id) ON DELETE SET NULL,
    medication_name TEXT NOT NULL,
    generic_name TEXT,
    category medication_category NOT NULL DEFAULT 'OTHER',
    form medication_form NOT NULL DEFAULT 'TABLET',
    dosage TEXT NOT NULL,
    dosage_value DECIMAL(10, 3),
    dosage_unit medication_unit NOT NULL DEFAULT 'MG',
    frequency medication_frequency NOT NULL DEFAULT 'ONCE_DAILY',
    timing medication_timing NOT NULL DEFAULT 'ANYTIME',
    instructions TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    prescribed_by TEXT,
    pharmacy TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for medication schedules
CREATE INDEX medication_schedules_patient_id_idx ON medication_schedules(patient_id);
CREATE INDEX medication_schedules_reminder_schedule_id_idx ON medication_schedules(reminder_schedule_id);
CREATE INDEX medication_schedules_category_idx ON medication_schedules(category);
CREATE INDEX medication_schedules_form_idx ON medication_schedules(form);
CREATE INDEX medication_schedules_frequency_idx ON medication_schedules(frequency);
CREATE INDEX medication_schedules_is_active_idx ON medication_schedules(is_active);
CREATE INDEX medication_schedules_start_date_idx ON medication_schedules(start_date);
CREATE INDEX medication_schedules_end_date_idx ON medication_schedules(end_date);
CREATE INDEX medication_schedules_patient_active_idx ON medication_schedules(patient_id, is_active);
CREATE INDEX medication_schedules_patient_date_active_idx ON medication_schedules(patient_id, start_date, is_active);
CREATE INDEX medication_schedules_deleted_at_idx ON medication_schedules(deleted_at);
CREATE INDEX medication_schedules_active_start_date_idx ON medication_schedules(is_active, start_date);
CREATE INDEX medication_schedules_patient_category_idx ON medication_schedules(patient_id, category);
CREATE INDEX medication_schedules_patient_frequency_idx ON medication_schedules(patient_id, frequency);

-- Medication administration logs table
CREATE TABLE medication_administration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_schedule_id UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,
    reminder_schedule_id UUID REFERENCES reminder_schedules(id) ON DELETE SET NULL,
    reminder_log_id UUID REFERENCES reminder_logs(id) ON DELETE SET NULL,
    medication_name TEXT NOT NULL,
    scheduled_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_date_time TIMESTAMP WITH TIME ZONE,
    dosage TEXT NOT NULL,
    dosage_taken TEXT,
    status TEXT NOT NULL CHECK (status IN ('TAKEN', 'MISSED', 'PARTIAL', 'REFUSED', 'DELAYED')),
    administered_by TEXT NOT NULL CHECK (administered_by IN ('PATIENT', 'CAREGIVER', 'HEALTHCARE_WORKER', 'SYSTEM')),
    notes TEXT,
    side_effects TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for medication administration logs
CREATE INDEX medication_admin_logs_patient_id_idx ON medication_administration_logs(patient_id);
CREATE INDEX medication_admin_logs_medication_schedule_id_idx ON medication_administration_logs(medication_schedule_id);
CREATE INDEX medication_admin_logs_reminder_schedule_id_idx ON medication_administration_logs(reminder_schedule_id);
CREATE INDEX medication_admin_logs_reminder_log_id_idx ON medication_administration_logs(reminder_log_id);
CREATE INDEX medication_admin_logs_scheduled_date_time_idx ON medication_administration_logs(scheduled_date_time);
CREATE INDEX medication_admin_logs_actual_date_time_idx ON medication_administration_logs(actual_date_time);
CREATE INDEX medication_admin_logs_status_idx ON medication_administration_logs(status);
CREATE INDEX medication_admin_logs_administered_by_idx ON medication_administration_logs(administered_by);
CREATE INDEX medication_admin_logs_patient_scheduled_idx ON medication_administration_logs(patient_id, scheduled_date_time);
CREATE INDEX medication_admin_logs_patient_status_idx ON medication_administration_logs(patient_id, status);
CREATE INDEX medication_admin_logs_scheduled_status_idx ON medication_administration_logs(scheduled_date_time, status);
CREATE INDEX medication_admin_logs_patient_date_status_idx ON medication_administration_logs(patient_id, scheduled_date_time, status);
CREATE INDEX medication_admin_logs_created_at_idx ON medication_administration_logs(created_at);

-- Reminder content attachments table
CREATE TABLE reminder_content_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_schedule_id UUID NOT NULL REFERENCES reminder_schedules(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video')),
    content_id UUID NOT NULL,
    content_title TEXT NOT NULL,
    content_url TEXT NOT NULL,
    attachment_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(reminder_schedule_id, content_type, content_id)
);

-- Indexes for reminder content attachments
CREATE INDEX reminder_content_reminder_idx ON reminder_content_attachments(reminder_schedule_id);
CREATE INDEX reminder_content_type_id_idx ON reminder_content_attachments(content_type, content_id);
CREATE INDEX reminder_content_created_at_idx ON reminder_content_attachments(created_at);
CREATE INDEX reminder_content_created_by_idx ON reminder_content_attachments(created_by);

-- Step 6: Create CMS tables

-- CMS articles table
CREATE TABLE cms_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    category content_category NOT NULL DEFAULT 'general',
    tags TEXT[] NOT NULL DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    status content_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for CMS articles
CREATE INDEX cms_articles_slug_idx ON cms_articles(slug);
CREATE INDEX cms_articles_status_idx ON cms_articles(status);
CREATE INDEX cms_articles_category_idx ON cms_articles(category);
CREATE INDEX cms_articles_published_at_idx ON cms_articles(published_at);
CREATE INDEX cms_articles_status_published_idx ON cms_articles(status, published_at);
CREATE INDEX cms_articles_category_status_idx ON cms_articles(category, status);
CREATE INDEX cms_articles_created_by_idx ON cms_articles(created_by);
CREATE INDEX cms_articles_deleted_at_idx ON cms_articles(deleted_at);
CREATE INDEX cms_articles_status_deleted_idx ON cms_articles(status, deleted_at);

-- CMS videos table
CREATE TABLE cms_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_minutes TEXT,
    category content_category NOT NULL DEFAULT 'motivational',
    tags TEXT[] NOT NULL DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    status content_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for CMS videos
CREATE INDEX cms_videos_slug_idx ON cms_videos(slug);
CREATE INDEX cms_videos_status_idx ON cms_videos(status);
CREATE INDEX cms_videos_category_idx ON cms_videos(category);
CREATE INDEX cms_videos_published_at_idx ON cms_videos(published_at);
CREATE INDEX cms_videos_status_published_idx ON cms_videos(status, published_at);
CREATE INDEX cms_videos_category_status_idx ON cms_videos(category, status);
CREATE INDEX cms_videos_created_by_idx ON cms_videos(created_by);
CREATE INDEX cms_videos_deleted_at_idx ON cms_videos(deleted_at);
CREATE INDEX cms_videos_status_deleted_idx ON cms_videos(status, deleted_at);

-- Step 7: Create LLM prompt tables

-- LLM prompt templates table
CREATE TABLE llm_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    response_format TEXT NOT NULL DEFAULT 'json' CHECK (response_format IN ('json', 'text')),
    max_tokens INTEGER NOT NULL DEFAULT 1000,
    temperature INTEGER NOT NULL DEFAULT 70,
    variables TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0
);

-- LLM prompt tests table
CREATE TABLE llm_prompt_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_audience JSONB,
    sample_size INTEGER,
    traffic_split INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- LLM prompt test variants table
CREATE TABLE llm_prompt_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES llm_prompt_tests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    variant TEXT NOT NULL CHECK (variant IN ('A', 'B', 'C', 'D')),
    prompt_template_id UUID NOT NULL REFERENCES llm_prompt_templates(id),
    weight INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- LLM prompt test results table
CREATE TABLE llm_prompt_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES llm_prompt_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES llm_prompt_test_variants(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    conversation_id UUID REFERENCES conversation_states(id),
    request JSONB NOT NULL,
    response JSONB NOT NULL,
    metrics JSONB NOT NULL,
    user_feedback JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- LLM prompt metrics table
CREATE TABLE llm_prompt_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_template_id UUID NOT NULL REFERENCES llm_prompt_templates(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_responses INTEGER NOT NULL DEFAULT 0,
    failed_responses INTEGER NOT NULL DEFAULT 0,
    average_response_time INTEGER,
    average_tokens_used INTEGER,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    user_satisfaction INTEGER,
    error_rate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 8: Create analytics tables

-- Analytics events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    session_id TEXT NOT NULL,
    event_data JSONB,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for analytics events
CREATE INDEX analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX analytics_events_event_name_idx ON analytics_events(event_name);
CREATE INDEX analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX analytics_events_patient_id_idx ON analytics_events(patient_id);
CREATE INDEX analytics_events_session_id_idx ON analytics_events(session_id);
CREATE INDEX analytics_events_timestamp_idx ON analytics_events(timestamp);
CREATE INDEX analytics_events_type_timestamp_idx ON analytics_events(event_type, timestamp);
CREATE INDEX analytics_events_user_session_idx ON analytics_events(user_id, session_id);

-- Performance metrics table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    threshold DECIMAL(10, 2),
    is_alert BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for performance metrics
CREATE INDEX performance_metrics_metric_type_idx ON performance_metrics(metric_type);
CREATE INDEX performance_metrics_metric_name_idx ON performance_metrics(metric_name);
CREATE INDEX performance_metrics_timestamp_idx ON performance_metrics(timestamp);
CREATE INDEX performance_metrics_is_alert_idx ON performance_metrics(is_alert);
CREATE INDEX performance_metrics_type_timestamp_idx ON performance_metrics(metric_type, timestamp);
CREATE INDEX performance_metrics_alert_timestamp_idx ON performance_metrics(is_alert, timestamp);

-- Cohort analysis table
CREATE TABLE cohort_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_name TEXT NOT NULL,
    cohort_date TIMESTAMP WITH TIME ZONE NOT NULL,
    patient_count INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for cohort analysis
CREATE INDEX cohort_analysis_cohort_name_idx ON cohort_analysis(cohort_name);
CREATE INDEX cohort_analysis_cohort_date_idx ON cohort_analysis(cohort_date);
CREATE INDEX cohort_analysis_is_active_idx ON cohort_analysis(is_active);
CREATE INDEX cohort_analysis_created_at_idx ON cohort_analysis(created_at);
CREATE INDEX cohort_analysis_name_active_idx ON cohort_analysis(cohort_name, is_active);
CREATE INDEX cohort_analysis_date_active_idx ON cohort_analysis(cohort_date, is_active);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    user_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_resource_type_idx ON audit_logs(resource_type);
CREATE INDEX audit_logs_resource_id_idx ON audit_logs(resource_id);
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_patient_id_idx ON audit_logs(patient_id);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp);
CREATE INDEX audit_logs_user_action_idx ON audit_logs(user_id, action);
CREATE INDEX audit_logs_resource_action_idx ON audit_logs(resource_type, action);
CREATE INDEX audit_logs_user_timestamp_idx ON audit_logs(user_id, timestamp);
CREATE INDEX audit_logs_patient_action_idx ON audit_logs(patient_id, action);

-- Data access logs table
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    access_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    access_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for data access logs
CREATE INDEX data_access_logs_user_id_idx ON data_access_logs(user_id);
CREATE INDEX data_access_logs_patient_id_idx ON data_access_logs(patient_id);
CREATE INDEX data_access_logs_access_type_idx ON data_access_logs(access_type);
CREATE INDEX data_access_logs_resource_type_idx ON data_access_logs(resource_type);
CREATE INDEX data_access_logs_timestamp_idx ON data_access_logs(timestamp);
CREATE INDEX data_access_logs_user_patient_idx ON data_access_logs(user_id, patient_id);
CREATE INDEX data_access_logs_patient_timestamp_idx ON data_access_logs(patient_id, timestamp);
CREATE INDEX data_access_logs_user_timestamp_idx ON data_access_logs(user_id, timestamp);
CREATE INDEX data_access_logs_access_type_timestamp_idx ON data_access_logs(access_type, timestamp);

-- System health metrics table
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    threshold DECIMAL(10, 2),
    critical_threshold DECIMAL(10, 2),
    status TEXT NOT NULL DEFAULT 'healthy',
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for system health metrics
CREATE INDEX system_health_metrics_metric_name_idx ON system_health_metrics(metric_name);
CREATE INDEX system_health_metrics_status_idx ON system_health_metrics(status);
CREATE INDEX system_health_metrics_timestamp_idx ON system_health_metrics(timestamp);
CREATE INDEX system_health_metrics_name_timestamp_idx ON system_health_metrics(metric_name, timestamp);
CREATE INDEX system_health_metrics_status_timestamp_idx ON system_health_metrics(status, timestamp);

-- Step 9: Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_notes_updated_at BEFORE UPDATE ON health_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_variables_updated_at BEFORE UPDATE ON patient_variables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversation_states_updated_at BEFORE UPDATE ON conversation_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_volunteer_notifications_updated_at BEFORE UPDATE ON volunteer_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminder_schedules_updated_at BEFORE UPDATE ON reminder_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminder_followups_updated_at BEFORE UPDATE ON reminder_followups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_schedules_updated_at BEFORE UPDATE ON medication_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_administration_logs_updated_at BEFORE UPDATE ON medication_administration_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_articles_updated_at BEFORE UPDATE ON cms_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_videos_updated_at BEFORE UPDATE ON cms_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_llm_prompt_templates_updated_at BEFORE UPDATE ON llm_prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_llm_prompt_tests_updated_at BEFORE UPDATE ON llm_prompt_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cohort_analysis_updated_at BEFORE UPDATE ON cohort_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Create default WhatsApp templates (without created_by for now)
-- These will be updated after you create your first admin user
INSERT INTO whatsapp_templates (template_name, template_text, variables, category, is_active, created_at, updated_at) VALUES
('verification_reminder', 'Halo {nama}, ini adalah pengingat verifikasi dari PRIMA. Silakan balas dengan "YA" untuk mengkonfirmasi bahwa Anda adalah pasien kami.', ARRAY['nama'], 'REMINDER', true, NOW(), NOW()),
('medication_reminder', 'Halo {nama}, sudah waktunya minum obat {obat}. Jangan lupa minum sesuai dosis yang dianjurkan dokter ya!', ARRAY['nama', 'obat'], 'REMINDER', true, NOW(), NOW()),
('follow_up_reminder', 'Halo {nama}, apakah reminder sebelumnya sudah dipatuhi?', ARRAY['nama'], 'REMINDER', true, NOW(), NOW()),
('emergency_contact', 'Halo {nama}, kami mendeteksi adanya keadaan darurat. Tim relawan kami akan segera menghubungi Anda.', ARRAY['nama'], 'APPOINTMENT', true, NOW(), NOW());

-- Script completed successfully!
-- Database has been reset and recreated with clean PRIMA schema