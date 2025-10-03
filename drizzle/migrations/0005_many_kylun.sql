-- ALTER TYPE "reminder_type" ADD VALUE 'MEDICATION'; -- Already exists--> statement-breakpoint
-- ALTER TYPE "template_category" ADD VALUE 'MEDICATION'; -- Already exists--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"action" text NOT NULL,
	"action_type" text,
	"message" text,
	"response" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manual_confirmations" ALTER COLUMN "visit_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_confirmations" ALTER COLUMN "visit_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_confirmations" ALTER COLUMN "patient_condition" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_confirmations" ALTER COLUMN "symptoms_reported" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_confirmations" ADD COLUMN "reminder_type" "reminder_type";--> statement-breakpoint
ALTER TABLE "manual_confirmations" ADD COLUMN "confirmation_type" text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_confirmations" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "priority" text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "recurrence_pattern" jsonb;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_reminder_id_idx" ON "reminder_logs" USING btree ("reminder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_id_idx" ON "reminder_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_action_idx" ON "reminder_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_timestamp_idx" ON "reminder_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_reminder_action_idx" ON "reminder_logs" USING btree ("reminder_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_timestamp_idx" ON "reminder_logs" USING btree ("patient_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_type_idx" ON "manual_confirmations" USING btree ("reminder_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmation_type_idx" ON "manual_confirmations" USING btree ("confirmation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_volunteer_idx" ON "manual_confirmations" USING btree ("patient_id","volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_confirmation_idx" ON "manual_confirmations" USING btree ("reminder_type","confirmation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_priority_idx" ON "reminders" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_type_status_idx" ON "reminders" USING btree ("reminder_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_patient_type_idx" ON "reminders" USING btree ("patient_id","reminder_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_active_type_idx" ON "reminders" USING btree ("is_active","reminder_type");