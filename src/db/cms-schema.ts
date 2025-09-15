 import {
   pgTable,
   text,
   timestamp,
   uuid,
   index,
 } from "drizzle-orm/pg-core";

// Import enums
import {
  contentCategoryEnum,
  contentStatusEnum,
} from "./enums";

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
    category: contentCategoryEnum("category").notNull().default("general"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("draft"),
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
    slugIdx: index("cms_articles_slug_idx").on(table.slug),
    statusIdx: index("cms_articles_status_idx").on(table.status),
    categoryIdx: index("cms_articles_category_idx").on(table.category),
    publishedAtIdx: index("cms_articles_published_at_idx").on(
      table.publishedAt
    ),
    statusPublishedIdx: index("cms_articles_status_published_idx").on(
      table.status,
      table.publishedAt
    ),
    categoryStatusIdx: index("cms_articles_category_status_idx").on(
      table.category,
      table.status
    ),
    createdByIdx: index("cms_articles_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("cms_articles_deleted_at_idx").on(table.deletedAt),
    statusDeletedIdx: index("cms_articles_status_deleted_idx").on(
      table.status,
      table.deletedAt
    ),
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
    category: contentCategoryEnum("category").notNull().default("motivational"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("draft"),
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
    slugIdx: index("cms_videos_slug_idx").on(table.slug),
    statusIdx: index("cms_videos_status_idx").on(table.status),
    categoryIdx: index("cms_videos_category_idx").on(table.category),
    publishedAtIdx: index("cms_videos_published_at_idx").on(table.publishedAt),
    statusPublishedIdx: index("cms_videos_status_published_idx").on(
      table.status,
      table.publishedAt
    ),
    categoryStatusIdx: index("cms_videos_category_status_idx").on(
      table.category,
      table.status
    ),
    createdByIdx: index("cms_videos_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("cms_videos_deleted_at_idx").on(table.deletedAt),
    statusDeletedIdx: index("cms_videos_status_deleted_idx").on(
      table.status,
      table.deletedAt
    ),
  })
);