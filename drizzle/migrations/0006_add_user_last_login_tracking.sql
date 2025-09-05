-- SKIP: This migration conflicts with existing database state
-- last_login_at column already exists in database
-- This functionality is handled by 0007_consolidated_schema_fix.sql

-- ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");