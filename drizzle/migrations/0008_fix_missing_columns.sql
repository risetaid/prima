-- Add missing variable_category column to patient_variables table
DO $$ BEGIN
  ALTER TABLE patient_variables ADD COLUMN variable_category text DEFAULT 'general';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add missing medications_taken column to reminder_logs table
DO $$ BEGIN
  ALTER TABLE reminder_logs ADD COLUMN medications_taken text[] DEFAULT '{}';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add index for variable_category if it doesn't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS patient_variables_category_idx ON patient_variables (variable_category);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Add index for medications_taken if it doesn't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS reminder_logs_medications_taken_idx ON reminder_logs USING GIN (medications_taken);
EXCEPTION
  WHEN others THEN null;
END $$;