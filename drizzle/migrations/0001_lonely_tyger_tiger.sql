-- ALTER TYPE "user_role" ADD VALUE 'DEVELOPER'; -- Already exists, skipping
--> statement-breakpoint
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
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_state_id_conversation_states_id_fk" FOREIGN KEY ("conversation_state_id") REFERENCES "public"."conversation_states"("id") ON DELETE no action ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "conversation_messages_llm_model_idx" ON "conversation_messages" USING btree ("llm_model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_llm_tokens_idx" ON "conversation_messages" USING btree ("llm_tokens_used");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_llm_cost_idx" ON "conversation_messages" USING btree ("llm_cost");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_llm_stats_idx" ON "conversation_messages" USING btree ("llm_model","llm_tokens_used","llm_cost");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_id_idx" ON "conversation_states" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_deleted_at_idx" ON "conversation_states" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_hash_idx" ON "llm_response_cache" USING btree ("message_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_id_idx" ON "volunteer_notifications" USING btree ("patient_id");