-- Rollback Migration 001: Remove MEDICATION from reminder types
-- This rollback should only be used if the migration causes issues

-- WARNING: This is a destructive operation. Make sure to backup data first.

-- Create new enum without MEDICATION
CREATE TYPE reminder_type_new AS ENUM ('APPOINTMENT', 'GENERAL');

-- Update all MEDICATION reminders to GENERAL
UPDATE reminders SET reminder_type = 'GENERAL' WHERE reminder_type = 'MEDICATION';

-- Alter the column to use the new enum
ALTER TABLE reminders ALTER COLUMN reminder_type TYPE reminder_type_new USING reminder_type::text::reminder_type_new;

-- Drop the old enum
DROP TYPE reminder_type;

-- Rename the new enum
ALTER TYPE reminder_type_new RENAME TO reminder_type;

-- Update template categories
CREATE TYPE template_category_new AS ENUM ('REMINDER', 'APPOINTMENT', 'EDUCATIONAL');

UPDATE whatsapp_templates SET category = 'REMINDER' WHERE category = 'MEDICATION';

ALTER TABLE whatsapp_templates ALTER COLUMN category TYPE template_category_new USING category::text::template_category_new;

DROP TYPE template_category;
ALTER TYPE template_category_new RENAME TO template_category;

-- Drop added indexes
DROP INDEX IF EXISTS reminders_type_status_idx;
DROP INDEX IF EXISTS reminders_patient_type_idx;
DROP INDEX IF EXISTS reminders_active_type_idx;
DROP INDEX IF EXISTS reminders_priority_idx;

-- Drop priority constraint and column
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_priority_check;
ALTER TABLE reminders DROP COLUMN IF EXISTS priority;