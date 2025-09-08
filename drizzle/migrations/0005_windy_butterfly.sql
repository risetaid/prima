DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_slug_idx" ON "cms_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_idx" ON "cms_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_category_idx" ON "cms_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_published_at_idx" ON "cms_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_published_idx" ON "cms_articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_category_status_idx" ON "cms_articles" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_created_by_idx" ON "cms_articles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_slug_idx" ON "cms_videos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_idx" ON "cms_videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_category_idx" ON "cms_videos" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_published_at_idx" ON "cms_videos" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_published_idx" ON "cms_videos" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_category_status_idx" ON "cms_videos" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_created_by_idx" ON "cms_videos" USING btree ("created_by");