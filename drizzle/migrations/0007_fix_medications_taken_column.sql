-- Fix medications_taken column type from boolean to text[]
-- This migration changes the column type and handles data conversion

-- First, add the new column with correct type if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "manual_confirmations" ADD COLUMN "medications_taken" text[] DEFAULT '{}';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- If the old boolean column exists, convert data and drop it
DO $$ BEGIN
  -- Check if old boolean column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_confirmations' AND column_name = 'medications_taken_old') THEN
    -- Copy data from old column to new column
    UPDATE "manual_confirmations" SET 
      "medications_taken" = CASE 
        WHEN "medications_taken_old" = true THEN ARRAY['unknown']::text[]
        ELSE '{}'::text[]
      END;
    
    -- Drop the old column
    ALTER TABLE "manual_confirmations" DROP COLUMN "medications_taken_old";
  END IF;
END $$;

-- Handle case where medications_taken exists as boolean column
DO $$ BEGIN
  -- Check if medications_taken is a boolean column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manual_confirmations' 
    AND column_name = 'medications_taken'
    AND data_type = 'boolean'
  ) THEN
    -- Rename existing boolean column
    ALTER TABLE "manual_confirmations" RENAME COLUMN "medications_taken" TO "medications_taken_old";
    
    -- Add new text[] column
    ALTER TABLE "manual_confirmations" ADD COLUMN "medications_taken" text[] DEFAULT '{}';
    
    -- Convert data
    UPDATE "manual_confirmations" SET 
      "medications_taken" = CASE 
        WHEN "medications_taken_old" = true THEN ARRAY['unknown']::text[]
        ELSE '{}'::text[]
      END;
    
    -- Drop old column
    ALTER TABLE "manual_confirmations" DROP COLUMN "medications_taken_old";
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
  ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;