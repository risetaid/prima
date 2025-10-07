import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { db, cmsVideos } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@/lib/logger'
// Extended validation schema for video updates
const updateVideoSchema = schemas.updateVideo.extend({
  category: z
    .enum([
      "GENERAL",
      "NUTRITION",
      "EXERCISE",
      "MOTIVATIONAL",
      "MEDICAL",
      "FAQ",
    ])
    .optional(),
});

// Utility function to extract YouTube/Vimeo video ID and generate embed URL
function processVideoUrl(url: string): {
  embedUrl: string;
  thumbnailUrl?: string;
} {
  // YouTube URL patterns
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  }

  // Vimeo URL patterns
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  // If it's already an embed URL or other format, return as-is
  return { embedUrl: url };
}

// GET /api/cms/videos/[id] - Get single video by ID
export const GET = createApiHandler(
  { auth: "required", params: schemas.uuidParam },
  async (_, { user, params }) => {
    // Only admins and developers can access video management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    const video = await db
      .select()
      .from(cmsVideos)
      .where(and(eq(cmsVideos.id, id), isNull(cmsVideos.deletedAt)))
      .limit(1);

    if (video.length === 0) {
      throw new Error("Video not found");
    }

    return {
      success: true,
      data: video[0],
    };
  }
);

// PUT /api/cms/videos/[id] - Update video
export const PUT = createApiHandler(
  { auth: "required", params: schemas.uuidParam, body: updateVideoSchema },
  async (body, { user, params }) => {
    // Only admins and developers can update videos
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    // Check if video exists and is not deleted
    const existingVideo = await db
      .select()
      .from(cmsVideos)
      .where(and(eq(cmsVideos.id, id), isNull(cmsVideos.deletedAt)))
      .limit(1);

    if (existingVideo.length === 0) {
      throw new Error("Video not found");
    }

    // Type the body properly
    const updateBody = body as {
      title?: string;
      videoUrl?: string;
      description?: string;
      slug?: string;
      category?: string;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      featured?: boolean;
      tags?: string[];
      thumbnailUrl?: string;
    };

    // If slug is being updated, ensure it's unique
    if (updateBody.slug) {
      const slugConflict = await db
        .select()
        .from(cmsVideos)
        .where(
          and(
            eq(cmsVideos.slug, updateBody.slug),
            isNull(cmsVideos.deletedAt)
          )
        )
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        throw new Error("Slug already exists");
      }
    }

    // Process video URL if provided
    let processedVideoData = {};
    if (updateBody.videoUrl) {
      const { embedUrl, thumbnailUrl: autoThumbnail } = processVideoUrl(
        updateBody.videoUrl
      );
      processedVideoData = {
        videoUrl: embedUrl,
        // Only update thumbnail if it's not explicitly provided and we have an auto-generated one
        ...(!updateBody.thumbnailUrl && autoThumbnail
          ? { thumbnailUrl: autoThumbnail }
          : {}),
      };
    }

    // Prepare update data
    const updateData = {
      ...updateBody,
      ...processedVideoData,
      category: updateBody.category as "GENERAL" | "NUTRITION" | "EXERCISE" | "MOTIVATIONAL" | "MEDICAL" | "FAQ" | undefined,
      updatedAt: new Date(),
      // Set publishedAt when status changes to published
      ...(updateBody.status === "PUBLISHED" &&
      existingVideo[0].status !== "PUBLISHED"
        ? { publishedAt: new Date() }
        : {}),
      // Clear publishedAt when status changes from published
      ...(updateBody.status !== "PUBLISHED" &&
      existingVideo[0].status === "PUBLISHED"
        ? { publishedAt: null }
        : {}),
    };

    // Update video
    const updatedVideo = await db
      .update(cmsVideos)
      .set(updateData)
      .where(eq(cmsVideos.id, id))
      .returning();

    logger.info('Video updated successfully', {
      videoId: id,
      title: updatedVideo[0].title,
      updatedBy: user!.id
    });

    return {
      success: true,
      message: "Video updated successfully",
      data: updatedVideo[0],
    };
  }
);

// DELETE /api/cms/videos/[id] - Soft delete video
export const DELETE = createApiHandler(
  { auth: "required", params: schemas.uuidParam },
  async (_, { user, params }) => {
    // Only admins and developers can delete videos
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    // Check if video exists and is not already deleted
    const existingVideo = await db
      .select()
      .from(cmsVideos)
      .where(and(eq(cmsVideos.id, id), isNull(cmsVideos.deletedAt)))
      .limit(1);

    if (existingVideo.length === 0) {
      throw new Error("Video not found");
    }

    // Soft delete video by setting deletedAt timestamp
    await db
      .update(cmsVideos)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cmsVideos.id, id));

    logger.info('Video deleted successfully', {
      videoId: id,
      title: existingVideo[0].title,
      deletedBy: user!.id
    });

    return {
      success: true,
      message: "Video deleted successfully",
    };
  }
);
