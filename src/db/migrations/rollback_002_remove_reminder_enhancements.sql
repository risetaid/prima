-- Rollback Migration 002: Remove reminder table enhancements
-- This rollback removes the enhanced fields added to reminders table

-- WARNING: This will lose data in the enhanced columns

-- Drop added columns from reminders table
ALTER TABLE reminders DROP COLUMN IF EXISTS title;
ALTER TABLE reminders DROP COLUMN IF EXISTS description;
ALTER TABLE reminders DROP COLUMN IF EXISTS priority;
ALTER TABLE reminders DROP COLUMN IF EXISTS recurrence_pattern;
ALTER TABLE reminders DROP COLUMN IF EXISTS metadata;

-- Drop added indexes
DROP INDEX IF EXISTS reminders_type_status_idx;
DROP INDEX IF EXISTS reminders_patient_type_idx;
DROP INDEX IF EXISTS reminders_active_type_idx;

-- Drop the update function
DROP FUNCTION IF EXISTS update_reminder_priority;