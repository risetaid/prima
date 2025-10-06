-- Phase 2: Performance Indexes for Railway Pro
-- These indexes significantly improve query performance for frequently accessed data
-- Updated to match actual schema columns

BEGIN;

-- Users table indexes (already have basic indexes, adding performance ones)
-- Note: clerk_id, is_active, is_approved already have indexes from schema
-- Adding composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
  ON users(email, is_active) 
  WHERE deleted_at IS NULL;

-- Patients table indexes
-- Index on assigned_volunteer_id for volunteer-specific patient lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_assigned_volunteer 
  ON patients(assigned_volunteer_id) 
  WHERE deleted_at IS NULL AND is_active = true;

-- Composite index for active patients by volunteer (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_volunteer_active 
  ON patients(assigned_volunteer_id, is_active) 
  WHERE deleted_at IS NULL;

-- Reminders table indexes
-- Index on start_date for scheduling queries (since next_send_at doesn't exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_start_date_active 
  ON reminders(start_date, scheduled_time) 
  WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for status-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_status_start 
  ON reminders(status, start_date) 
  WHERE deleted_at IS NULL;

-- Medical records table indexes
-- Note: medical_records doesn't have deleted_at column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_patient_date 
  ON medical_records(patient_id, recorded_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_type_date 
  ON medical_records(record_type, recorded_date DESC);

-- CMS Articles indexes
-- Using status instead of is_published
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_articles_status_published 
  ON cms_articles(status, published_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_articles_category_status 
  ON cms_articles(category, status) 
  WHERE deleted_at IS NULL;

-- CMS Videos indexes  
-- Using status instead of is_published
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_videos_status_published 
  ON cms_videos(status, published_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_videos_category_status 
  ON cms_videos(category, status) 
  WHERE deleted_at IS NULL;

-- Conversation states indexes
-- Additional index for phone number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_phone 
  ON conversation_states(phone_number) 
  WHERE deleted_at IS NULL AND is_active = true;

-- Manual confirmations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manual_confirmations_type_date 
  ON manual_confirmations(confirmation_type, visit_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manual_confirmations_followup 
  ON manual_confirmations(follow_up_needed, confirmed_at DESC) 
  WHERE follow_up_needed = true;

-- Reminder logs indexes (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminder_logs_action_timestamp 
  ON reminder_logs(action, timestamp DESC);

-- Volunteer notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_volunteer_notifications_status_priority 
  ON volunteer_notifications(status, priority, created_at DESC);

COMMIT;

-- Note: CONCURRENTLY indexes are created without locking the table
-- This allows the application to continue running during index creation
-- Perfect for production Railway Pro environment
