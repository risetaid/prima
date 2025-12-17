import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

// Import clean enums
import {
  contentCategoryEnum,
  contentStatusEnum,
} from "@/db/enums";

// Re-export enums for convenience
export {
  contentCategoryEnum,
  contentStatusEnum,
};

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
  (table) => ({
    // Note: Table is currently empty (0 rows). Add indexes when table has >1000 rows.
    // Removed all 6 indexes: slug, status, category, publishedAt, createdBy, deletedAt
    // slug already has unique constraint which creates an index automatically
    // Other indexes should be added based on actual query patterns when table has data
  })
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
  (table) => ({
    // Note: Table is currently empty (0 rows). Add indexes when table has >1000 rows.
    // Removed all 6 indexes: slug, status, category, publishedAt, createdBy, deletedAt
    // slug already has unique constraint which creates an index automatically
    // Other indexes should be added based on actual query patterns when table has data
  })
);

// ===== RATE LIMITING TABLES =====

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rateLimitKey: text('rate_limit_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for key cleanup queries (most common pattern)
    rateLimitKeyCreatedAtIdx: index('rate_limits_key_created_at_idx').on(table.rateLimitKey, table.createdAt),
    // Note: Removed 2 redundant single-column indexes (rateLimitKey, createdAt)
    // Both are covered by the composite index above
    // Table is also currently empty (0 rows)
  })
);

// ===== TYPE EXPORTS =====
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;