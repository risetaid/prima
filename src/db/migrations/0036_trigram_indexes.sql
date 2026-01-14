-- Migration: Add Trigram Indexes for Fuzzy Search
-- Enables efficient ILIKE queries for patient name/phone search

-- Enable pg_trgm extension (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Patients table trigram indexes for fuzzy search
-- Supports ILIKE queries with better performance than GIN on text

-- Index for patient name fuzzy search (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS patients_name_trgm_idx
ON patients USING gin (name gin_trgm_ops)
WHERE deletedAt IS NULL;

-- Index for patient phone number fuzzy search
-- Useful for handling slight variations in phone format
CREATE INDEX CONCURRENTLY IF NOT EXISTS patients_phone_trgm_idx
ON patients USING gin (phoneNumber gin_trgm_ops)
WHERE deletedAt IS NULL;

-- Reminders table trigram indexes
-- Index for message content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS reminders_message_trgm_idx
ON reminders USING gin (message gin_trgm_ops)
WHERE deletedAt IS NULL AND status = 'PENDING';

-- Articles/Content table trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS articles_title_trgm_idx
ON articles USING gin (title gin_trgm_ops)
WHERE deletedAt IS NULL;

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'patients'
AND indexname LIKE '%trgm%';

COMMENT ON INDEX patients_name_trgm_idx IS 'Trigram index for patient name fuzzy search (case-insensitive ILIKE)';
COMMENT ON INDEX patients_phone_trgm_idx IS 'Trigram index for phone number fuzzy search';
COMMENT ON INDEX reminders_message_trgm_idx IS 'Trigram index for reminder message content search';
COMMENT ON INDEX articles_title_trgm_idx IS 'Trigram index for article title fuzzy search';
