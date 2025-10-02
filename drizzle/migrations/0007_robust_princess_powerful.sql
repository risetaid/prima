ALTER TABLE "conversation_states" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_states" ADD COLUMN "context_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_states" ADD COLUMN "last_clarification_sent_at" timestamp with time zone;