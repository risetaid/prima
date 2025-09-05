-- SKIP: This migration conflicts with existing database state  
-- unsubscribed already exists in database
-- This functionality is handled by 0007_consolidated_schema_fix.sql

-- ALTER TYPE "verification_status" ADD VALUE 'unsubscribed';