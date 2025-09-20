-- Phase 1 Migration: Enhance manual_confirmations table for general reminder support
-- This migration adds support for different confirmation types and reminder types

-- Add new columns to manual_confirmations table
ALTER TABLE manual_confirmations ADD COLUMN IF NOT EXISTS reminder_type reminder_type;
ALTER TABLE manual_confirmations ADD COLUMN IF NOT EXISTS confirmation_type TEXT DEFAULT 'GENERAL';
ALTER TABLE manual_confirmations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Make some fields nullable to support general confirmations
ALTER TABLE manual_confirmations ALTER COLUMN visit_date DROP NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN visit_time DROP NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN patient_condition DROP NOT NULL;
ALTER TABLE manual_confirmations ALTER COLUMN symptoms_reported SET DEFAULT '{}';

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_confirmations_confirmation_type_check') THEN
        ALTER TABLE manual_confirmations ADD CONSTRAINT manual_confirmations_confirmation_type_check
        CHECK (confirmation_type IN ('VISIT', 'PHONE_CALL', 'MESSAGE', 'GENERAL'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS manual_confirmations_reminder_type_idx ON manual_confirmations(reminder_type);
CREATE INDEX IF NOT EXISTS manual_confirmations_confirmation_type_idx ON manual_confirmations(confirmation_type);
CREATE INDEX IF NOT EXISTS manual_confirmations_patient_volunteer_idx ON manual_confirmations(patient_id, volunteer_id);
CREATE INDEX IF NOT EXISTS manual_confirmations_reminder_confirmation_idx ON manual_confirmations(reminder_type, confirmation_type);

-- Update existing records to have default values
UPDATE manual_confirmations
SET confirmation_type =
    CASE
        WHEN visit_date IS NOT NULL AND visit_time IS NOT NULL THEN 'VISIT'
        ELSE 'GENERAL'
    END,
    reminder_type = 'MEDICATION'
WHERE reminder_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN manual_confirmations.reminder_type IS 'Type of reminder this confirmation relates to';
COMMENT ON COLUMN manual_confirmations.confirmation_type IS 'How the confirmation was made';
COMMENT ON COLUMN manual_confirmations.created_at IS 'When this confirmation record was created';

-- Create function to backfill reminder_type from linked reminders
CREATE OR REPLACE FUNCTION backfill_manual_confirmation_reminder_types()
RETURNS VOID AS $$
BEGIN
    UPDATE manual_confirmations mc
    SET reminder_type = r.reminder_type
    FROM reminders r
    WHERE mc.reminder_id = r.id
    AND mc.reminder_type IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT backfill_manual_confirmation_reminder_types();