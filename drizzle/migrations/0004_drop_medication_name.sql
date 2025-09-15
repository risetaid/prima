-- Drop medication_name column from reminder_schedules table
ALTER TABLE "reminder_schedules" DROP COLUMN IF EXISTS "medication_name";