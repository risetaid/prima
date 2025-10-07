import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { db, cmsVideos } from '@/db'
import { eq, desc, and, or, ilike, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@/lib/logger'
// Extended validation schema for video creation
const createVideoSchema = schemas.createVideo.extend({
  category: z.enum([
    "GENERAL",
    "NUTRITION",
    "EXERCISE",
    "MOTIVATIONAL",
    "MEDICAL",
    "FAQ",
  ]),
});

// Utility function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
}

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

// Query schema for video listing
const videosQuerySchema = z.object({
  page: schemas.pagination.shape.page.default(1),
  limit: schemas.pagination.shape.limit.default(10),
  search: z.string().default(""),
  category: z.string().default(""),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

// GET /api/cms/videos - List videos with search and pagination
export const GET = createApiHandler(
  { auth: "required", query: videosQuerySchema },
  async (_, { user, query }) => {
    // Only admins and developers can access video management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { page, limit, search, category, status } = query!;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const whereConditions = [
      // Exclude deleted videos
      isNull(cmsVideos.deletedAt),
    ];

    if (search) {
      whereConditions.push(
        or(
          ilike(cmsVideos.title, `%${search}%`),
          ilike(cmsVideos.description, `%${search}%`)
        )!
      );
    }

    if (category) {
      whereConditions.push(
        eq(
          cmsVideos.category,
          category as
          | "GENERAL"
          | "NUTRITION"
          | "EXERCISE"
          | "MOTIVATIONAL"
          | "MEDICAL"
          | "FAQ"
        )
      );
    }

    if (status) {
      whereConditions.push(
        eq(cmsVideos.status, status as "DRAFT" | "PUBLISHED" | "ARCHIVED")
      );
    }

    const whereClause = and(...whereConditions);

    // Get videos with pagination
    const videos = await db
      .select()
      .from(cmsVideos)
      .where(whereClause)
      .orderBy(desc(cmsVideos.updatedAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: cmsVideos.id })
      .from(cmsVideos)
      .where(whereClause);

    const total = totalCount.length;
    const totalPages = Math.ceil(total / Number(limit));

    return {
      success: true,
      data: videos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    };
  }
);

// POST /api/cms/videos - Create new video
export const POST = createApiHandler(
  { auth: "required", body: createVideoSchema },
  async (body, { user }) => {
    // Only admins and developers can create videos
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    // Type the body properly
    const videoBody = body as {
      title: string;
      videoUrl: string;
      description?: string;
      slug?: string;
      category?: string;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      featured?: boolean;
      tags?: string[];
      thumbnailUrl?: string;
    };

    // Process video URL to get embed URL and auto thumbnail
    const { embedUrl, thumbnailUrl: autoThumbnail } = processVideoUrl(
      videoBody.videoUrl
    );

    // Generate slug if not provided or auto-generate from title
    const slug = videoBody.slug || generateSlug(videoBody.title);

    // Ensure slug is unique
    let slugSuffix = 0;
    let finalSlug = slug;

    while (true) {
      const existingVideo = await db
        .select()
        .from(cmsVideos)
        .where(and(eq(cmsVideos.slug, finalSlug), isNull(cmsVideos.deletedAt)))
        .limit(1);

      if (existingVideo.length === 0) break;

      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    // Create video
    const newVideo = {
      title: videoBody.title,
      slug: finalSlug,
      videoUrl: embedUrl,
      description: videoBody.description || null,
      thumbnailUrl: videoBody.thumbnailUrl || autoThumbnail || null,
      category: (videoBody.category || "GENERAL") as "GENERAL" | "NUTRITION" | "EXERCISE" | "MOTIVATIONAL" | "MEDICAL" | "FAQ",
      status: (videoBody.status || "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      featured: videoBody.featured || false,
      tags: videoBody.tags || [],
      createdBy: user!.clerkId,
      publishedAt: videoBody.status === "PUBLISHED" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdVideo = await db
      .insert(cmsVideos)
      .values(newVideo)
      .returning();

    logger.info('Video created successfully', {
      videoId: createdVideo[0].id,
      title: createdVideo[0].title,
      createdBy: user!.id
    });

    return {
      success: true,
      message: "Video created successfully",
      data: createdVideo[0],
    };
  }
);

