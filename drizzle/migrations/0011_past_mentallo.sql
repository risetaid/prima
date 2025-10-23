ALTER TABLE "conversation_messages" ADD COLUMN "llm_response_id" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "llm_model" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "llm_tokens_used" integer;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "llm_response_time_ms" integer;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "llm_cost" text;