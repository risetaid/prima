/**
 * Apply LLM Migration Script
 * This script applies the LLM-specific database changes
 */

import { sql } from 'drizzle-orm'
import { db } from '@/db'

async function applyLLMMigration() {
  try {
    console.log('🚀 Applying LLM migration...')

    // Add LLM columns to conversation_messages table
    console.log('📝 Adding LLM columns to conversation_messages...')
    await db.execute(sql`
      ALTER TABLE conversation_messages
      ADD COLUMN IF NOT EXISTS llm_response_id TEXT,
      ADD COLUMN IF NOT EXISTS llm_model TEXT,
      ADD COLUMN IF NOT EXISTS llm_tokens_used INTEGER,
      ADD COLUMN IF NOT EXISTS llm_cost DECIMAL(10, 6),
      ADD COLUMN IF NOT EXISTS llm_response_time_ms INTEGER;
    `)

    // Create indexes for LLM-related queries
    console.log('🔍 Creating LLM indexes...')
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_model ON conversation_messages(llm_model);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_tokens ON conversation_messages(llm_tokens_used);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_cost ON conversation_messages(llm_cost);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_llm_stats ON conversation_messages(llm_model, llm_tokens_used, llm_cost);
    `)

    // Add comments to document the columns
    console.log('📋 Adding column comments...')
    await db.execute(sql`
      COMMENT ON COLUMN conversation_messages.llm_response_id IS 'LLM response identifier for tracking';
      COMMENT ON COLUMN conversation_messages.llm_model IS 'LLM model used (e.g., glm-4.5)';
      COMMENT ON COLUMN conversation_messages.llm_tokens_used IS 'Number of tokens consumed by LLM';
      COMMENT ON COLUMN conversation_messages.llm_cost IS 'Cost in USD for the LLM response';
      COMMENT ON COLUMN conversation_messages.llm_response_time_ms IS 'Response time in milliseconds';
    `)

    console.log('✅ LLM migration applied successfully!')

  } catch (error) {
    console.error('❌ LLM migration failed:', error)
    process.exit(1)
  }
}

// Run the migration if called directly
if (require.main === module) {
  applyLLMMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration execution failed:', error)
      process.exit(1)
    })
}

export { applyLLMMigration }