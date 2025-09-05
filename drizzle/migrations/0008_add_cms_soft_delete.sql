-- Add soft delete columns to CMS tables
-- This allows marking articles and videos as deleted without removing them from database

-- Add deleted_at column to cms_articles table
ALTER TABLE "cms_articles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- Add deleted_at column to cms_videos table  
ALTER TABLE "cms_videos" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- Add indexes for better performance on queries excluding deleted content
CREATE INDEX IF NOT EXISTS "cms_articles_deleted_at_idx" ON "cms_articles" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "cms_videos_deleted_at_idx" ON "cms_videos" USING btree ("deleted_at");

-- Composite indexes for status + deleted queries (most common query pattern)
CREATE INDEX IF NOT EXISTS "cms_articles_status_deleted_idx" ON "cms_articles" USING btree ("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "cms_videos_status_deleted_idx" ON "cms_videos" USING btree ("status", "deleted_at");

-- Published content that's not deleted (for public queries)
CREATE INDEX IF NOT EXISTS "cms_articles_published_active_idx" ON "cms_articles" USING btree ("status", "published_at", "deleted_at") WHERE "status" = 'published' AND "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "cms_videos_published_active_idx" ON "cms_videos" USING btree ("status", "published_at", "deleted_at") WHERE "status" = 'published' AND "deleted_at" IS NULL;