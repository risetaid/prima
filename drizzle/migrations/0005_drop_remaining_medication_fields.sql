-- Drop remaining medication-related fields and tables

-- Drop medications table
DROP TABLE IF EXISTS "medications";

-- Drop dosage column from reminder_schedules
ALTER TABLE "reminder_schedules" DROP COLUMN IF EXISTS "dosage";

-- Drop medication-related columns from manual_confirmations
ALTER TABLE "manual_confirmations" DROP COLUMN IF EXISTS "medications_taken";
ALTER TABLE "manual_confirmations" DROP COLUMN IF EXISTS "medications_missed";

-- Drop medication-related indexes
DROP INDEX IF EXISTS "manual_confirmations_medications_taken_idx";

-- Update poll_responses to remove medication-related entries
DELETE FROM "poll_responses" WHERE "poll_type" = 'medication';