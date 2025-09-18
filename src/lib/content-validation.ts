/**
 * Centralized content validation utilities for PRIMA Medical System
 *
 * This module centralizes content validation logic to eliminate duplication
 * across API routes and services.
 */

import { db, cmsArticles, cmsVideos } from "@/db";
import { eq, and, isNull } from "drizzle-orm";

export interface ContentAttachment {
  id: string;
  type: "article" | "video" | "ARTICLE" | "VIDEO";
  title: string;
}

export interface ValidatedContent {
  id: string;
  type: "article" | "video";
  title: string;
  url: string;
}

/**
 * Validate and process content attachments for reminders
 *
 * This function centralizes the validation logic for content attachments
 * used in reminder creation and updates.
 *
 * @param attachedContent - Array of content attachments to validate
 * @returns Array of validated content with URLs
 */
export async function validateContentAttachments(
  attachedContent: ContentAttachment[]
): Promise<ValidatedContent[]> {
  const validatedContent: ValidatedContent[] = [];

  for (const content of attachedContent) {
    if (!content.id || !content.type || !content.title) {
      continue; // Skip invalid content
    }

    // Normalize the content type to lowercase
    const normalizedType = content.type.toLowerCase() as "article" | "video";

    try {
      if (normalizedType === "article") {
        const articleResult = await db
          .select({ slug: cmsArticles.slug, title: cmsArticles.title })
          .from(cmsArticles)
          .where(
            and(
              eq(cmsArticles.id, content.id),
              eq(cmsArticles.status, "PUBLISHED"),
              isNull(cmsArticles.deletedAt)
            )
          )
          .limit(1);

        if (articleResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "article",
            title: articleResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${articleResult[0].slug}`,
          });
        }
      } else if (normalizedType === "video") {
        const videoResult = await db
          .select({ slug: cmsVideos.slug, title: cmsVideos.title })
          .from(cmsVideos)
          .where(
            and(
              eq(cmsVideos.id, content.id),
              eq(cmsVideos.status, "PUBLISHED"),
              isNull(cmsVideos.deletedAt)
            )
          )
          .limit(1);

        if (videoResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "video",
            title: videoResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${videoResult[0].slug}`,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to validate content ${content.id}:`, error);
      continue;
    }
  }

  return validatedContent;
}

/**
 * Check if content attachments are valid without full processing
 *
 * This is a lightweight validation that doesn't fetch full content details.
 *
 * @param attachedContent - Array of content attachments to check
 * @returns True if all content is valid
 */
export async function isValidContentAttachments(
  attachedContent: ContentAttachment[]
): Promise<boolean> {
  if (!attachedContent || !Array.isArray(attachedContent)) {
    return false;
  }

  for (const content of attachedContent) {
    if (!content.id || !content.type || !content.title) {
      return false;
    }

    const normalizedType = content.type.toLowerCase();
    if (normalizedType !== "article" && normalizedType !== "video") {
      return false;
    }

    // Check if content exists and is published
    try {
      if (normalizedType === "article") {
        const articleResult = await db
          .select({ id: cmsArticles.id })
          .from(cmsArticles)
          .where(
            and(
              eq(cmsArticles.id, content.id),
              eq(cmsArticles.status, "PUBLISHED"),
              isNull(cmsArticles.deletedAt)
            )
          )
          .limit(1);

        if (articleResult.length === 0) {
          return false;
        }
      } else if (normalizedType === "video") {
        const videoResult = await db
          .select({ id: cmsVideos.id })
          .from(cmsVideos)
          .where(
            and(
              eq(cmsVideos.id, content.id),
              eq(cmsVideos.status, "PUBLISHED"),
              isNull(cmsVideos.deletedAt)
            )
          )
          .limit(1);

        if (videoResult.length === 0) {
          return false;
        }
      }
    } catch (error) {
      console.warn(`Error validating content ${content.id}:`, error);
      return false;
    }
  }

  return true;
}

/**
 * Get content URL for a given content ID and type
 *
 * @param contentId - Content ID
 * @param contentType - Content type ('article' or 'video')
 * @returns Content URL or null if not found
 */
export async function getContentUrl(
  contentId: string,
  contentType: "article" | "video"
): Promise<string | null> {
  try {
    if (contentType === "article") {
      const articleResult = await db
        .select({ slug: cmsArticles.slug })
        .from(cmsArticles)
        .where(
          and(
            eq(cmsArticles.id, contentId),
            eq(cmsArticles.status, "PUBLISHED"),
            isNull(cmsArticles.deletedAt)
          )
        )
        .limit(1);

      if (articleResult.length > 0) {
        return `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${articleResult[0].slug}`;
      }
    } else if (contentType === "video") {
      const videoResult = await db
        .select({ slug: cmsVideos.slug })
        .from(cmsVideos)
        .where(
          and(
            eq(cmsVideos.id, contentId),
            eq(cmsVideos.status, "PUBLISHED"),
            isNull(cmsVideos.deletedAt)
          )
        )
        .limit(1);

      if (videoResult.length > 0) {
        return `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${videoResult[0].slug}`;
      }
    }
  } catch (error) {
    console.warn(`Error getting content URL for ${contentId}:`, error);
  }

  return null;
}

