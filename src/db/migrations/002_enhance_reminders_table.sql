-- Phase 1 Migration: Enhance reminders table for general reminder support
-- This migration adds new fields to support different types of reminders

-- Add new columns to reminders table
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add priority constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_priority_check') THEN
        ALTER TABLE reminders ADD CONSTRAINT reminders_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add composite indexes for better performance
CREATE INDEX IF NOT EXISTS reminders_type_status_idx ON reminders(reminder_type, status);
CREATE INDEX IF NOT EXISTS reminders_patient_type_idx ON reminders(patient_id, reminder_type);
CREATE INDEX IF NOT EXISTS reminders_active_type_idx ON reminders(is_active, reminder_type);

-- Create function to update default priority for existing reminders
CREATE OR REPLACE FUNCTION update_reminder_priority()
RETURNS VOID AS $$
BEGIN
    -- Set default priority for existing reminders based on type
    UPDATE reminders
    SET priority =
        CASE
            WHEN reminder_type = 'MEDICATION' THEN 'high'
            WHEN reminder_type = 'APPOINTMENT' THEN 'medium'
            ELSE 'medium'
        END
    WHERE priority IS NULL;

    -- Set title based on message if empty
    UPDATE reminders
    SET title = LEFT(message, 100)
    WHERE title IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_reminder_priority();

-- Add comments for documentation
COMMENT ON COLUMN reminders.title IS 'Short title for the reminder';
COMMENT ON COLUMN reminders.description IS 'Detailed description of the reminder';
COMMENT ON COLUMN reminders.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN reminders.recurrence_pattern IS 'JSON pattern for recurring reminders';
COMMENT ON COLUMN reminders.metadata IS 'Additional metadata for the reminder';