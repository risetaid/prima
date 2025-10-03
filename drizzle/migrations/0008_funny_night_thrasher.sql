DROP INDEX IF EXISTS "conversation_messages_llm_model_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_messages_llm_tokens_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_messages_llm_cost_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_messages_llm_stats_idx";--> statement-breakpoint
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "llm_response_id";--> statement-breakpoint
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "llm_model";--> statement-breakpoint
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "llm_tokens_used";--> statement-breakpoint
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "llm_cost";--> statement-breakpoint
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "llm_response_time_ms";