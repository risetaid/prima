-- SKIP: This migration conflicts with existing database state
-- SUPERADMIN already exists in database
-- This functionality is handled by 0007_consolidated_schema_fix.sql

-- ALTER TYPE "user_role" ADD VALUE 'SUPERADMIN';