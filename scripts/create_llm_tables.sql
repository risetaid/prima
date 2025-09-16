-- Manual SQL script to create LLM integration tables
-- Run this if the migration system is having issues

-- Create conversation_messages table
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

-- Create conversation_states table
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

-- Create llm_response_cache table
CREATE TABLE IF NOT EXISTS "llm_response_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_hash" text NOT NULL,
	"patient_context_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

-- Create volunteer_notifications table
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

-- Add foreign key constraints
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_state_id_conversation_states_id_fk"
  FOREIGN KEY ("conversation_state_id") REFERENCES "conversation_states"("id") ON DELETE cascade;

ALTER TABLE "conversation_states" ADD CONSTRAINT "conversation_states_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action;

ALTER TABLE "volunteer_notifications" ADD CONSTRAINT "volunteer_notifications_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_state_id_idx" ON "conversation_messages" USING btree ("conversation_state_id");
CREATE INDEX IF NOT EXISTS "conversation_states_patient_id_idx" ON "conversation_states" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_hash_idx" ON "llm_response_cache" USING btree ("message_hash");
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_id_idx" ON "volunteer_notifications" USING btree ("patient_id");