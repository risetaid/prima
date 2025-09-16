-- Migration: Add LLM-specific fields to conversation_messages table
-- This migration adds fields to store LLM response metadata for conversation history

-- Add LLM-specific columns to conversation_messages table
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS llm_response_id TEXT,
ADD COLUMN IF NOT EXISTS llm_model TEXT,
ADD COLUMN IF NOT EXISTS llm_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS llm_cost DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS llm_response_time_ms INTEGER;

-- Add indexes for LLM-related queries
CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_model ON conversation_messages(llm_model);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_tokens ON conversation_messages(llm_tokens_used);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_cost ON conversation_messages(llm_cost);

-- Add composite index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_stats ON conversation_messages(llm_model, llm_tokens_used, llm_cost);

-- Add comment to document the migration
COMMENT ON COLUMN conversation_messages.llm_response_id IS 'LLM response identifier for tracking';
COMMENT ON COLUMN conversation_messages.llm_model IS 'LLM model used (e.g., glm-4.5)';
COMMENT ON COLUMN conversation_messages.llm_tokens_used IS 'Number of tokens consumed by LLM';
COMMENT ON COLUMN conversation_messages.llm_cost IS 'Cost in USD for the LLM response';
COMMENT ON COLUMN conversation_messages.llm_response_time_ms IS 'Response time in milliseconds';