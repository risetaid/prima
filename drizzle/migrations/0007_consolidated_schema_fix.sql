-- Consolidated Schema Migration
-- Fixes enum conflicts and ensures all tables exist
-- Generated: $(date)

-- ===== ENUM UPDATES =====

-- Add SUPERADMIN to user_role if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPERADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE "user_role" ADD VALUE 'SUPERADMIN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add unsubscribed to verification_status if it doesn't exist  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unsubscribed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'verification_status')) THEN
    ALTER TYPE "verification_status" ADD VALUE 'unsubscribed';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===== MISSING TABLES =====

-- Create CMS Articles table if not exists
CREATE TABLE IF NOT EXISTS "cms_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"featured_image_url" text,
	"category" "content_category" DEFAULT 'general' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_articles_slug_unique" UNIQUE("slug")
);

-- Create CMS Videos table if not exists
CREATE TABLE IF NOT EXISTS "cms_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration_minutes" text,
	"category" "content_category" DEFAULT 'motivational' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_videos_slug_unique" UNIQUE("slug")
);

-- Create Patient Variables table if not exists  
CREATE TABLE IF NOT EXISTS "patient_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"variable_value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid NOT NULL
);

-- Create Verification Logs table if not exists
CREATE TABLE IF NOT EXISTS "verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"action" text NOT NULL,
	"message_sent" text,
	"patient_response" text,
	"verification_result" "verification_status",
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ===== COLUMN ADDITIONS =====

-- Add verification columns to patients table if they don't exist
DO $$ BEGIN
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_status" "verification_status" DEFAULT 'pending_verification' NOT NULL;
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_sent_at" timestamp with time zone;
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_response_at" timestamp with time zone;
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_message" text;
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_attempts" text DEFAULT '0';
  ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "verification_expires_at" timestamp with time zone;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add last_login_at to users table if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ===== INDEXES =====

-- CMS Articles indexes
CREATE INDEX IF NOT EXISTS "cms_articles_slug_idx" ON "cms_articles" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "cms_articles_status_idx" ON "cms_articles" USING btree ("status");
CREATE INDEX IF NOT EXISTS "cms_articles_category_idx" ON "cms_articles" USING btree ("category");
CREATE INDEX IF NOT EXISTS "cms_articles_published_at_idx" ON "cms_articles" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "cms_articles_status_published_idx" ON "cms_articles" USING btree ("status","published_at");
CREATE INDEX IF NOT EXISTS "cms_articles_category_status_idx" ON "cms_articles" USING btree ("category","status");
CREATE INDEX IF NOT EXISTS "cms_articles_created_by_idx" ON "cms_articles" USING btree ("created_by");

-- CMS Videos indexes
CREATE INDEX IF NOT EXISTS "cms_videos_slug_idx" ON "cms_videos" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "cms_videos_status_idx" ON "cms_videos" USING btree ("status");
CREATE INDEX IF NOT EXISTS "cms_videos_category_idx" ON "cms_videos" USING btree ("category");
CREATE INDEX IF NOT EXISTS "cms_videos_published_at_idx" ON "cms_videos" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "cms_videos_status_published_idx" ON "cms_videos" USING btree ("status","published_at");
CREATE INDEX IF NOT EXISTS "cms_videos_category_status_idx" ON "cms_videos" USING btree ("category","status");
CREATE INDEX IF NOT EXISTS "cms_videos_created_by_idx" ON "cms_videos" USING btree ("created_by");

-- Patient Variables indexes
CREATE INDEX IF NOT EXISTS "patient_variables_patient_idx" ON "patient_variables" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "patient_variables_name_idx" ON "patient_variables" USING btree ("patient_id","variable_name");
CREATE INDEX IF NOT EXISTS "patient_variables_patient_active_idx" ON "patient_variables" USING btree ("patient_id","is_active");

-- Verification Logs indexes
CREATE INDEX IF NOT EXISTS "verification_logs_patient_idx" ON "verification_logs" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "verification_logs_created_at_idx" ON "verification_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "verification_logs_action_idx" ON "verification_logs" USING btree ("action");

-- Patient verification indexes
CREATE INDEX IF NOT EXISTS "patients_verification_status_idx" ON "patients" USING btree ("verification_status");
CREATE INDEX IF NOT EXISTS "patients_verification_status_active_idx" ON "patients" USING btree ("verification_status","is_active");

-- User last login index
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");