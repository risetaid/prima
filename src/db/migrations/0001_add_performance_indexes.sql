-- Phase 2: Performance Indexes for Railway Pro
-- These indexes significantly improve query performance for frequently accessed data

BEGIN;

-- Users table indexes
-- Index on clerk_id (used in every authentication request)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clerk_id 
  ON users(clerk_id) 
  WHERE deleted_at IS NULL;

-- Composite index for approved and active users (dashboard queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_approved_active 
  ON users(is_approved, is_active) 
  WHERE deleted_at IS NULL;

-- Index on email for user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
  ON users(email) 
  WHERE deleted_at IS NULL;

-- Patients table indexes
-- Index on is_active for filtering active patients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_active 
  ON patients(is_active) 
  WHERE deleted_at IS NULL;

-- Index on volunteer_id for volunteer-specific patient lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_volunteer 
  ON patients(volunteer_id) 
  WHERE deleted_at IS NULL;

-- Composite index for active patients by volunteer (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_volunteer_active 
  ON patients(volunteer_id, is_active) 
  WHERE deleted_at IS NULL;

-- Index on phone_number for WhatsApp lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_phone 
  ON patients(phone_number) 
  WHERE deleted_at IS NULL;

-- Reminders table indexes
-- Index on patient_id (most frequent reminder queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_patient 
  ON reminders(patient_id) 
  WHERE deleted_at IS NULL;

-- Index on next_send_at for scheduling queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_next_send 
  ON reminders(next_send_at) 
  WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for active reminders by patient
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_patient_active 
  ON reminders(patient_id, is_active) 
  WHERE deleted_at IS NULL;

-- Health notes table indexes
-- Composite index on patient_id and created_at (for patient history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_notes_patient_created 
  ON health_notes(patient_id, created_at DESC);

-- Medical records table indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_patient 
  ON medical_records(patient_id) 
  WHERE deleted_at IS NULL;

-- Conversation states indexes
-- Index on patient_id for conversation lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_patient 
  ON conversation_states(patient_id);

-- Index on updated_at for recent conversation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_updated 
  ON conversation_states(updated_at DESC);

-- Message queue indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_queue_status 
  ON message_queue(status, scheduled_at);

-- CMS Articles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_articles_published 
  ON cms_articles(is_published, published_at DESC) 
  WHERE deleted_at IS NULL;

-- CMS Videos indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_videos_published 
  ON cms_videos(is_published, published_at DESC) 
  WHERE deleted_at IS NULL;

COMMIT;

-- Note: CONCURRENTLY indexes are created without locking the table
-- This allows the application to continue running during index creation
-- Perfect for production Railway Pro environment
