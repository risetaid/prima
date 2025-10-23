-- Migration: Add AI metadata fields to conversation_messages table
-- Created: 2025-01-23
-- Description: Adds LLM tracking fields for Claude AI integration

-- Add AI metadata columns to conversation_messages table
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS llm_response_id text,
ADD COLUMN IF NOT EXISTS llm_model text,
ADD COLUMN IF NOT EXISTS llm_tokens_used integer,
ADD COLUMN IF NOT EXISTS llm_response_time_ms integer,
ADD COLUMN IF NOT EXISTS llm_cost text;

-- Create index on llm_model for analytics queries
CREATE INDEX IF NOT EXISTS conversation_messages_llm_model_idx
ON conversation_messages(llm_model)
WHERE llm_model IS NOT NULL;

-- Create index on llm_response_id for debugging
CREATE INDEX IF NOT EXISTS conversation_messages_llm_response_id_idx
ON conversation_messages(llm_response_id)
WHERE llm_response_id IS NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN conversation_messages.llm_response_id IS 'Claude API response ID for tracking';
COMMENT ON COLUMN conversation_messages.llm_model IS 'AI model used (e.g., claude-haiku-4-5-20251001)';
COMMENT ON COLUMN conversation_messages.llm_tokens_used IS 'Total tokens consumed (input + output)';
COMMENT ON COLUMN conversation_messages.llm_response_time_ms IS 'AI response latency in milliseconds';
COMMENT ON COLUMN conversation_messages.llm_cost IS 'API cost in USD (stored as string for precision)';
