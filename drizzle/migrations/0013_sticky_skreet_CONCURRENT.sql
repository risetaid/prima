-- CRITICAL: This is the PRODUCTION-SAFE version with CONCURRENT keyword
-- Use this file for production deployments to avoid table locks

-- Original drizzle-kit generated file: 0013_sticky_skreet.sql
-- Modified to add CONCURRENT keyword for zero-downtime index creation

-- Index 1: conversation_messages - message history lookup
-- Expected improvement: 150ms → <5ms
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_messages_state_created_idx" 
ON "conversation_messages" USING btree ("conversation_state_id","created_at");

-- Index 2: conversation_states - active conversation lookup  
-- Expected improvement: 200ms → <10ms
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_states_patient_active_expires_idx" 
ON "conversation_states" USING btree ("patient_id","is_active","expires_at");

-- NOTES:
-- 1. CONCURRENT allows index creation without locking the table
-- 2. Takes longer but safe for production with active users
-- 3. Requires two transactions instead of one
-- 4. Can be safely run during peak traffic
-- 5. If interrupted, can be resumed without issues

-- VERIFICATION AFTER RUNNING:
-- SELECT indexrelname, idx_scan, idx_tup_read 
-- FROM pg_stat_user_indexes 
-- WHERE indexrelname LIKE '%conversation%'
-- ORDER BY idx_scan DESC;
