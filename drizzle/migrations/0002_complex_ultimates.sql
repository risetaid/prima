ALTER TABLE "reminders" ALTER COLUMN "reminder_type" SET DEFAULT 'GENERAL';--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP COLUMN IF EXISTS "medications_taken";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "medication_details";