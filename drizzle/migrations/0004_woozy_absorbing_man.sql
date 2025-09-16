CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_state_id" uuid NOT NULL,
	"message" text NOT NULL,
	"direction" text NOT NULL,
	"message_type" text NOT NULL,
	"intent" text,
	"confidence" integer,
	"processed_at" timestamp with time zone,
	"llm_response_id" text,
	"llm_model" text,
	"llm_tokens_used" integer,
	"llm_cost" numeric(10, 6),
	"llm_response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"current_context" text NOT NULL,
	"expected_response_type" text,
	"related_entity_id" uuid,
	"related_entity_type" text,
	"state_data" jsonb,
	"last_message" text,
	"last_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_response_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_hash" text NOT NULL,
	"patient_context_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_volunteer_id" uuid,
	"escalation_reason" text NOT NULL,
	"confidence" integer,
	"intent" text,
	"patient_context" jsonb,
	"responded_at" timestamp with time zone,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "medications";--> statement-breakpoint
DROP TABLE "patient_medications";--> statement-breakpoint
ALTER TABLE "health_notes" DROP CONSTRAINT "health_notes_recorded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP CONSTRAINT "manual_confirmations_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP CONSTRAINT "manual_confirmations_volunteer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP CONSTRAINT "manual_confirmations_reminder_schedule_id_reminder_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP CONSTRAINT "manual_confirmations_reminder_log_id_reminder_logs_id_fk";
--> statement-breakpoint
ALTER TABLE "medical_records" DROP CONSTRAINT "medical_records_recorded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_variables" DROP CONSTRAINT "patient_variables_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_assigned_volunteer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reminder_content_attachments" DROP CONSTRAINT "reminder_content_attachments_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reminder_logs" DROP CONSTRAINT "reminder_logs_reminder_schedule_id_reminder_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "reminder_logs" DROP CONSTRAINT "reminder_logs_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "reminder_schedules" DROP CONSTRAINT "reminder_schedules_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "reminder_schedules" DROP CONSTRAINT "reminder_schedules_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_logs" DROP CONSTRAINT "verification_logs_processed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "whatsapp_templates" DROP CONSTRAINT "whatsapp_templates_created_by_users_id_fk";
--> statement-breakpoint
-- Drop indexes before dropping columns (only if column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_confirmations' AND column_name = 'medications_taken') THEN
    DROP INDEX IF EXISTS "manual_confirmations_medications_taken_idx";
  END IF;
END $$;
DROP INDEX IF EXISTS "reminder_logs_patient_confirmation_idx";--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "doctor_name" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "hospital_name" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_state_id_conversation_states_id_fk" FOREIGN KEY ("conversation_state_id") REFERENCES "public"."conversation_states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_states" ADD CONSTRAINT "conversation_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "volunteer_notifications" ADD CONSTRAINT "volunteer_notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_state_id_idx" ON "conversation_messages" USING btree ("conversation_state_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_direction_idx" ON "conversation_messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_message_type_idx" ON "conversation_messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_direction_idx" ON "conversation_messages" USING btree ("conversation_state_id","direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_type_created_idx" ON "conversation_messages" USING btree ("message_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_id_idx" ON "conversation_states" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_phone_number_idx" ON "conversation_states" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_current_context_idx" ON "conversation_states" USING btree ("current_context");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_is_active_idx" ON "conversation_states" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_expires_at_idx" ON "conversation_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_active_idx" ON "conversation_states" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_context_active_idx" ON "conversation_states" USING btree ("current_context","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_deleted_at_idx" ON "conversation_states" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_context_active_idx" ON "conversation_states" USING btree ("patient_id","current_context","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_hash_idx" ON "llm_response_cache" USING btree ("message_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_patient_context_hash_idx" ON "llm_response_cache" USING btree ("patient_context_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_expires_at_idx" ON "llm_response_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_patient_unique_idx" ON "llm_response_cache" USING btree ("message_hash","patient_context_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_id_idx" ON "volunteer_notifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_priority_idx" ON "volunteer_notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_status_idx" ON "volunteer_notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_assigned_volunteer_idx" ON "volunteer_notifications" USING btree ("assigned_volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_escalation_reason_idx" ON "volunteer_notifications" USING btree ("escalation_reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_created_at_idx" ON "volunteer_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_status_priority_idx" ON "volunteer_notifications" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_assigned_status_idx" ON "volunteer_notifications" USING btree ("assigned_volunteer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_status_idx" ON "volunteer_notifications" USING btree ("patient_id","status");--> statement-breakpoint
-- Drop medications_taken column if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_confirmations' AND column_name = 'medications_taken') THEN
    ALTER TABLE "manual_confirmations" DROP COLUMN "medications_taken";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "manual_confirmations" DROP COLUMN IF EXISTS "medications_missed";--> statement-breakpoint
ALTER TABLE "reminder_schedules" DROP COLUMN IF EXISTS "medication_name";--> statement-breakpoint
ALTER TABLE "reminder_schedules" DROP COLUMN IF EXISTS "dosage";--> statement-breakpoint
ALTER TABLE "reminder_schedules" DROP COLUMN IF EXISTS "doctor_name";