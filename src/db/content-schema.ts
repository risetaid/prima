import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Import clean enums
import { contentCategoryEnum, contentStatusEnum } from "@/db/enums";

// Re-export enums for convenience
export { contentCategoryEnum, contentStatusEnum };

// ===== CMS TABLES =====

export const cmsArticles = pgTable(
  "cms_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    featuredImageUrl: text("featured_image_url"),
    category: contentCategoryEnum("category").notNull().default("GENERAL"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(), // Clerk user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  () => ({
    // GIN index for tags array searches (e.g., tags @> ARRAY['nutrition'])
    // Defined in migration SQL - Drizzle doesn't support GIN on arrays in schema
    // Full-text search index on title, excerpt, content (Indonesian language)
    // Supports: to_tsquery('indonesian', 'cancer & treatment')
    // Defined in migration SQL - Drizzle doesn't support generated tsvector columns
    // Note: slug already has unique constraint which creates an index automatically
  }),
);

export const cmsVideos = pgTable(
  "cms_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    videoUrl: text("video_url").notNull(), // YouTube/Vimeo embed URL
    thumbnailUrl: text("thumbnail_url"),
    durationMinutes: text("duration_minutes"), // Using text for flexibility (e.g., "5:30")
    category: contentCategoryEnum("category").notNull().default("MOTIVATIONAL"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(), // Clerk user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  () => ({
    // GIN index for tags array searches (e.g., tags @> ARRAY['exercise'])
    // Defined in migration SQL - Drizzle doesn't support GIN on arrays in schema
    // Full-text search index on title and description (Indonesian language)
    // Supports: to_tsquery('indonesian', 'exercise & yoga')
    // Defined in migration SQL - Drizzle doesn't support generated tsvector columns
    // Note: slug already has unique constraint which creates an index automatically
  }),
);

// ===== RATE LIMITING TABLES =====
// NOTE: rateLimits table removed in migration 0016_schema_optimizations.sql
// Redis handles all rate limiting - table was unused and removed to clean up schema

// ===== TYPE EXPORTS =====
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;
