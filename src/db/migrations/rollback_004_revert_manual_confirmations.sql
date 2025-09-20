-- Rollback Migration 004: Revert manual_confirmations enhancements
-- This rollback removes the enhanced fields from manual_confirmations table

-- WARNING: This will lose data in the enhanced columns

-- Make fields required again
ALTER TABLE manual_confirmations ALTER COLUMN visit_date SET NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN visit_time SET NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN patient_condition SET NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN symptoms_reported SET DEFAULT '{}';
ALTER TABLE manual_confirmations ALTER COLUMN symptoms_reported SET NOT NULL;

-- Drop enhanced columns
ALTER TABLE manual_confirmations DROP COLUMN IF EXISTS reminder_type;
ALTER TABLE manual_confirmations DROP COLUMN IF EXISTS confirmation_type;
ALTER TABLE manual_confirmations DROP COLUMN IF EXISTS created_at;

-- Drop added indexes
DROP INDEX IF EXISTS manual_confirmations_reminder_type_idx;
DROP INDEX IF EXISTS manual_confirmations_confirmation_type_idx;
DROP INDEX IF EXISTS manual_confirmations_patient_volunteer_idx;
DROP INDEX IF EXISTS manual_confirmations_reminder_confirmation_idx;

-- Drop the backfill function
DROP FUNCTION IF EXISTS backfill_manual_confirmation_reminder_types;