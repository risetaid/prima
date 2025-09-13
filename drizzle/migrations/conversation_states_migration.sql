-- Migration: Add conversation state management tables
-- Created: 2025-01-13

-- Create conversation_states table
CREATE TABLE IF NOT EXISTS "conversation_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "patient_id" uuid NOT NULL,
  "phone_number" text NOT NULL,
  "current_context" text NOT NULL,
  "expected_response_type" text,
  "related_entity_id" uuid,
  "related_entity_type" text,
  "state_data" jsonb,
  "last_message" text,
  "last_message_at" timestamp with time zone,
  "message_count" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_state_id" uuid NOT NULL,
  "message" text NOT NULL,
  "direction" text NOT NULL,
  "message_type" text NOT NULL,
  "intent" text,
  "confidence" integer,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "conversation_states_patient_id_idx" ON "conversation_states"("patient_id");
CREATE INDEX IF NOT EXISTS "conversation_states_phone_number_idx" ON "conversation_states"("phone_number");
CREATE INDEX IF NOT EXISTS "conversation_states_current_context_idx" ON "conversation_states"("current_context");
CREATE INDEX IF NOT EXISTS "conversation_states_is_active_idx" ON "conversation_states"("is_active");
CREATE INDEX IF NOT EXISTS "conversation_states_expires_at_idx" ON "conversation_states"("expires_at");
CREATE INDEX IF NOT EXISTS "conversation_states_patient_active_idx" ON "conversation_states"("patient_id", "is_active");
CREATE INDEX IF NOT EXISTS "conversation_states_context_active_idx" ON "conversation_states"("current_context", "is_active");

CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_state_id_idx" ON "conversation_messages"("conversation_state_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_direction_idx" ON "conversation_messages"("direction");
CREATE INDEX IF NOT EXISTS "conversation_messages_message_type_idx" ON "conversation_messages"("message_type");
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages"("created_at");
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_direction_idx" ON "conversation_messages"("conversation_state_id", "direction");
CREATE INDEX IF NOT EXISTS "conversation_messages_type_created_idx" ON "conversation_messages"("message_type", "created_at");

-- Add foreign key constraints
ALTER TABLE "conversation_states" ADD CONSTRAINT "conversation_states_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;

ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_state_id_conversation_states_id_fk"
  FOREIGN KEY ("conversation_state_id") REFERENCES "conversation_states"("id") ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "conversation_states" IS 'Tracks conversation context and state for patient interactions';
COMMENT ON TABLE "conversation_messages" IS 'Stores individual messages within conversations with NLP analysis';

COMMENT ON COLUMN "conversation_states"."current_context" IS 'Current conversation context: verification, reminder_confirmation, general_inquiry, emergency';
COMMENT ON COLUMN "conversation_states"."expected_response_type" IS 'Expected response type: yes_no, confirmation, text, number';
COMMENT ON COLUMN "conversation_states"."state_data" IS 'Additional context data stored as JSON';
COMMENT ON COLUMN "conversation_messages"."direction" IS 'Message direction: inbound, outbound';
COMMENT ON COLUMN "conversation_messages"."intent" IS 'Detected intent from NLP processing';
COMMENT ON COLUMN "conversation_messages"."confidence" IS 'Confidence score for intent detection (0-100)';