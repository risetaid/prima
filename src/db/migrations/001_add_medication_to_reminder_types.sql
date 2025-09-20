-- Phase 1 Migration: Add MEDICATION to reminder_type enum
-- This migration adds the missing MEDICATION type to support existing medication reminders

-- Add MEDICATION to reminder_type enum
ALTER TYPE reminder_type ADD VALUE 'MEDICATION';

-- Update existing GENERAL reminders that are actually medication-related
-- This is a data migration that should be customized based on actual data
UPDATE reminders
SET reminder_type = 'MEDICATION'
WHERE reminder_type = 'GENERAL'
AND (
  message ILIKE '%obat%' OR
  message ILIKE '%minum%' OR
  message ILIKE '%medication%' OR
  message ILIKE '%konsumsi%' OR
  message ILIKE '%telan%'
);

-- Add MEDICATION to template_category enum
ALTER TYPE template_category ADD VALUE 'MEDICATION';

-- Update template categories for medication-related templates
UPDATE whatsapp_templates
SET category = 'MEDICATION'
WHERE category = 'REMINDER'
AND (
  template_name ILIKE '%obat%' OR
  template_name ILIKE '%medication%' OR
  template_text ILIKE '%obat%' OR
  template_text ILIKE '%minum%'
);

-- Create indexes for reminder type queries
CREATE INDEX IF NOT EXISTS reminders_type_status_idx ON reminders(reminder_type, status);
CREATE INDEX IF NOT EXISTS reminders_patient_type_idx ON reminders(patient_id, reminder_type);
CREATE INDEX IF NOT EXISTS reminders_active_type_idx ON reminders(is_active, reminder_type);
CREATE INDEX IF NOT EXISTS reminders_priority_idx ON reminders(priority);

-- Add priority constraint
ALTER TABLE reminders ADD CONSTRAINT reminders_priority_check
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));