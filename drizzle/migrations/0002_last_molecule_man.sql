CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_state_id" uuid NOT NULL,
	"message" text NOT NULL,
	"direction" text NOT NULL,
	"message_type" text NOT NULL,
	"intent" text,
	"confidence" integer,
	"processed_at" timestamp with time zone,
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
CREATE TABLE IF NOT EXISTS "poll_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_log_id" uuid,
	"patient_id" uuid NOT NULL,
	"poll_type" text NOT NULL,
	"poll_name" text NOT NULL,
	"selected_option" text NOT NULL,
	"response_time" timestamp with time zone DEFAULT now() NOT NULL,
	"message_id" text,
	"poll_data" jsonb,
	"phone_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
 ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_reminder_log_id_reminder_logs_id_fk" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "poll_responses_patient_id_idx" ON "poll_responses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_responses_reminder_log_id_idx" ON "poll_responses" USING btree ("reminder_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_responses_poll_type_idx" ON "poll_responses" USING btree ("poll_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_responses_response_time_idx" ON "poll_responses" USING btree ("response_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_responses_phone_number_idx" ON "poll_responses" USING btree ("phone_number");