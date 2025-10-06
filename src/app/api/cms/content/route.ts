import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAuthUser } from "@/lib/auth-utils";
import { db, cmsArticles, cmsVideos, users } from "@/db";
import { contentCategoryEnum } from "@/db/enums";
import { eq, desc, and, count, isNull, sql, or, ilike } from "drizzle-orm";
import { get, set, CACHE_TTL } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Interface for unified content response - matches frontend ContentItem interface
interface UnifiedContent {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: "article" | "video";
  thumbnailUrl: string | null;
  featuredImageUrl: string | null;
  authorName: string;
}

// Schema for template creation request
const createTemplateSchema = z.object({
  templateId: z.string(),
  contentId: z.string().optional(),
  contentType: z.enum(['article', 'video']).optional(),
  patientData: z.record(z.string(), z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all, articles, videos
    const status = searchParams.get("status") || "all"; // all, draft, published, archived
    const published = searchParams.get("published"); // true, false, or undefined
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const offset = (page - 1) * limit;
    const isPublic = searchParams.get("public") === "true";
    const isEnhanced = searchParams.get("enhanced") === "true";

    // Different authentication requirements based on access type
    let user;
    if (isPublic) {
      // Public endpoint - any authenticated user can access published content
      user = await getAuthUser();
      if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    } else {
      // Admin endpoint - only admins and developers can access
      user = await getCurrentUser();
      if (!user || !["ADMIN", "DEVELOPER"].includes(user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // For public access, only return published content
    const effectiveStatus = isPublic ? "published" : status;
    const effectivePublished = isPublic ? true : published;

    // Try cache for published content
    if (isPublic) {
      const cacheKey = `published-content:${page}:${limit}:${search}:${category}:${type}`;
      const cachedContent = await get(cacheKey);
      if (cachedContent) {
        return NextResponse.json(cachedContent);
      }
    }

    // Build where conditions
    const buildConditions = (contentType: 'article' | 'video') => {
      const conditions = [
        // Exclude soft-deleted content
        isNull(contentType === 'article' ? cmsArticles.deletedAt : cmsVideos.deletedAt),
      ];

      // Status filter (from effectiveStatus)
      if (effectiveStatus !== "all") {
        const statusField = contentType === 'article' ? cmsArticles.status : cmsVideos.status;
        conditions.push(eq(statusField, effectiveStatus.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED"));
      }

      // Published filter (from effectivePublished query param)
      // NOTE: This can be redundant with effectiveStatus filter above when isPublic=true
      // TODO: Refactor to eliminate redundancy
      if (effectivePublished !== undefined && effectiveStatus === "all") {
        const statusField = contentType === 'article' ? cmsArticles.status : cmsVideos.status;
        // Handle both boolean true and string "true"
        if (effectivePublished === true || effectivePublished === "true") {
          conditions.push(eq(statusField, "PUBLISHED"));
        } else {
          conditions.push(
            or(
              eq(statusField, "DRAFT"),
              eq(statusField, "ARCHIVED")
            )!
          );
        }
      }

      // Search filter
      if (search) {
        if (contentType === 'article') {
          conditions.push(
            or(
              ilike(cmsArticles.title, `%${search}%`),
              ilike(cmsArticles.content, `%${search}%`),
              ilike(cmsArticles.excerpt, `%${search}%`)
            )!
          );
        } else {
          conditions.push(
            or(
              ilike(cmsVideos.title, `%${search}%`),
              ilike(cmsVideos.description, `%${search}%`)
            )!
          );
        }
      }

      // Category filter
      if (category && ['GENERAL', 'NUTRITION', 'EXERCISE', 'MOTIVATIONAL', 'MEDICAL', 'FAQ'].includes(category)) {
        const categoryField = contentType === 'article' ? cmsArticles.category : cmsVideos.category;
        conditions.push(eq(categoryField, category as typeof contentCategoryEnum.enumValues[number]));
      }

      return conditions;
    };

    // Get articles
    let articles: UnifiedContent[] = [];
    if (type === "all" || type === "articles") {
      const articleConditions = buildConditions('article');

      const articleResults = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          excerpt: cmsArticles.excerpt,
          featuredImageUrl: cmsArticles.featuredImageUrl,
          category: cmsArticles.category,
          tags: cmsArticles.tags,
          status: cmsArticles.status,
          publishedAt: cmsArticles.publishedAt,
          createdAt: cmsArticles.createdAt,
          updatedAt: cmsArticles.updatedAt,
          createdBy: cmsArticles.createdBy,
          authorName: sql<string>`COALESCE(
              CONCAT(${users.firstName}, ' ', ${users.lastName}),
              ${users.email},
              ${cmsArticles.createdBy}
            )`.as("author_name"),
        })
        .from(cmsArticles)
        .leftJoin(users, eq(users.clerkId, cmsArticles.createdBy))
        .where(and(...articleConditions))
        .orderBy(
          desc(sql`COALESCE(${cmsArticles.publishedAt}, ${cmsArticles.updatedAt})`)
        )
        .limit(type === "articles" ? limit : Math.ceil(limit / 2))
        .offset(type === "articles" ? offset : 0);

      articles = articleResults.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        status: article.status.toLowerCase() as "draft" | "published" | "archived",
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        type: "article" as const,
        thumbnailUrl: article.featuredImageUrl,
        featuredImageUrl: article.featuredImageUrl,
        authorName: article.authorName,
      }));
    }

    // Get videos
    let videos: UnifiedContent[] = [];
    if (type === "all" || type === "videos") {
      const videoConditions = buildConditions('video');

      const videoResults = await db
        .select({
          id: cmsVideos.id,
          title: cmsVideos.title,
          slug: cmsVideos.slug,
          description: cmsVideos.description,
          thumbnailUrl: cmsVideos.thumbnailUrl,
          videoUrl: cmsVideos.videoUrl,
          durationMinutes: cmsVideos.durationMinutes,
          category: cmsVideos.category,
          tags: cmsVideos.tags,
          status: cmsVideos.status,
          publishedAt: cmsVideos.publishedAt,
          createdAt: cmsVideos.createdAt,
          updatedAt: cmsVideos.updatedAt,
          createdBy: cmsVideos.createdBy,
          authorName: sql<string>`COALESCE(
              CONCAT(${users.firstName}, ' ', ${users.lastName}),
              ${users.email},
              ${cmsVideos.createdBy}
            )`.as("author_name"),
        })
        .from(cmsVideos)
        .leftJoin(users, eq(users.clerkId, cmsVideos.createdBy))
        .where(and(...videoConditions))
        .orderBy(
          desc(sql`COALESCE(${cmsVideos.publishedAt}, ${cmsVideos.updatedAt})`)
        )
        .limit(type === "videos" ? limit : Math.ceil(limit / 2))
        .offset(type === "videos" ? offset : 0);

      videos = videoResults.map((video) => ({
        id: video.id,
        title: video.title,
        slug: video.slug,
        category: video.category,
        status: video.status.toLowerCase() as "draft" | "published" | "archived",
        publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
        type: "video" as const,
        thumbnailUrl: video.thumbnailUrl,
        featuredImageUrl: null,
        authorName: video.authorName,
      }));
    }

    // Combine and sort by published date (fallback to updatedAt if publishedAt is null)
    const combinedContent = [...articles, ...videos]
      .sort((a, b) => {
        // Use publishedAt if available, otherwise fall back to updatedAt
        const dateA = a.publishedAt 
          ? new Date(a.publishedAt).getTime() 
          : new Date(a.updatedAt).getTime();
        const dateB = b.publishedAt 
          ? new Date(b.publishedAt).getTime() 
          : new Date(b.updatedAt).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);

    // Build response
    interface EnhancedResponse {
      success: boolean;
      data: UnifiedContent[];
      statistics?: object;
      pagination?: object;
      filters?: object;
      enhancedTemplates?: {
        id: string;
        name: string;
        category: string;
        template: string;
        variables: string[];
        description: string;
      }[];
      availableArticles?: {
        id: string;
        title: string;
        slug: string;
        category: string;
        url: string;
        type: 'article';
        excerpt: string;
      }[];
      availableVideos?: {
        id: string;
        title: string;
        slug: string;
        category: string;
        url: string;
        type: 'video';
        description: string;
      }[];
    }

    let response: EnhancedResponse;

    if (isEnhanced) {
      // For enhanced templates, return data in ContentSelector expected format
      const enhancedTemplates = [
        {
          id: "motivation_with_video",
          name: "Motivasi dengan Video",
          category: "motivational",
          template: "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
          variables: ["{nama}", "{video_url}"],
          description: "Pesan motivasi dengan link video"
        },
        {
          id: "nutrition_reminder",
          name: "Pengingat Nutrisi",
          category: "nutrition",
          template: "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
          variables: ["{nama}", "{artikel_url}"],
          description: "Pengingat makan bergizi dengan artikel nutrisi"
        },
        {
          id: "exercise_motivation",
          name: "Motivasi Olahraga",
          category: "exercise",
          template: "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
          variables: ["{nama}", "{video_url}"],
          description: "Motivasi olahraga dengan video demonstrasi"
        },
        {
          id: "general_reminder",
          name: "Pengingat Umum",
          category: "general",
          template: "Halo {nama}! ⏰\n\nIni adalah pengingat untuk Anda. {customMessage}\n\nJangan lupa dilakukan ya! 💙 Tim PRIMA",
          variables: ["{nama}", "{customMessage}"],
          description: "Pengingat umum yang dapat dikustomisasi"
        },
        {
          id: "wellness_check",
          name: "Cek Kesehatan",
          category: "medical",
          template: "Halo {nama}! 💙\n\nBagaimana kabar Anda hari ini? {customMessage}\n\nKami siap membantu jika ada yang dibutuhkan. 🙏 Tim PRIMA",
          variables: ["{nama}", "{customMessage}"],
          description: "Cek kondisi kesehatan pasien"
        },
      ];

      // Transform content data to match expected format
      // Get articles with excerpt data
      const articleResults = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          excerpt: cmsArticles.excerpt,
          category: cmsArticles.category,
        })
        .from(cmsArticles)
        .where(and(eq(cmsArticles.status, 'PUBLISHED'), isNull(cmsArticles.deletedAt)))
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(50);

      const availableArticles = articleResults.map((article: { id: string; title: string; slug: string; excerpt: string | null; category: string }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category.toLowerCase(),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article.slug}`,
        type: 'article' as const,
        excerpt: article.excerpt || ''
      }));

      // Get videos with description data
      const videoResults = await db
        .select({
          id: cmsVideos.id,
          title: cmsVideos.title,
          slug: cmsVideos.slug,
          description: cmsVideos.description,
          category: cmsVideos.category,
        })
        .from(cmsVideos)
        .where(and(eq(cmsVideos.status, 'PUBLISHED'), isNull(cmsVideos.deletedAt)))
        .orderBy(desc(cmsVideos.publishedAt))
        .limit(50);

      const availableVideos = videoResults.map((video: { id: string; title: string; slug: string; description: string | null; category: string }) => ({
        id: video.id,
        title: video.title,
        slug: video.slug,
        category: video.category.toLowerCase(),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video.slug}`,
        type: 'video' as const,
        description: video.description || ''
      }));

      response = {
        success: true,
        data: combinedContent,
        enhancedTemplates,
        availableArticles,
        availableVideos
      };
    } else {
      response = {
        success: true,
        data: combinedContent,
      };
    }

    // Add pagination for non-admin requests
    if (isPublic) {
      // Get total counts for pagination
      const [totalArticlesResult, totalVideosResult] = await Promise.all([
        type === 'all' || type === 'article' ?
          db.select({ count: count() }).from(cmsArticles)
            .where(and(eq(cmsArticles.status, 'PUBLISHED'), isNull(cmsArticles.deletedAt))) : [{ count: 0 }],
        type === 'all' || type === 'video' ?
          db.select({ count: count() }).from(cmsVideos)
            .where(and(eq(cmsVideos.status, 'PUBLISHED'), isNull(cmsVideos.deletedAt))) : [{ count: 0 }]
      ]);

      const totalCount = (totalArticlesResult[0]?.count || 0) + (totalVideosResult[0]?.count || 0);
      const hasMore = offset + limit < totalCount;

      response = {
        ...response,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore,
          totalPages: Math.ceil(totalCount / limit)
        },
        filters: {
          search,
          category,
          type
        }
      };

      // Cache the response for 15 minutes
      await set(`published-content:${page}:${limit}:${search}:${category}:${type}`, response, CACHE_TTL.PATIENT);
    } else {
      // Add statistics for admin requests
      let stats;
      try {
        stats = await Promise.all([
          // Article stats (exclude deleted)
          db.select({ count: count() }).from(cmsArticles).where(isNull(cmsArticles.deletedAt)),
          db.select({ count: count() }).from(cmsArticles).where(and(eq(cmsArticles.status, "PUBLISHED"), isNull(cmsArticles.deletedAt))),
          db.select({ count: count() }).from(cmsArticles).where(and(eq(cmsArticles.status, "DRAFT"), isNull(cmsArticles.deletedAt))),
          // Video stats (exclude deleted)
          db.select({ count: count() }).from(cmsVideos).where(isNull(cmsVideos.deletedAt)),
          db.select({ count: count() }).from(cmsVideos).where(and(eq(cmsVideos.status, "PUBLISHED"), isNull(cmsVideos.deletedAt))),
          db.select({ count: count() }).from(cmsVideos).where(and(eq(cmsVideos.status, "DRAFT"), isNull(cmsVideos.deletedAt))),
        ]);
      } catch (statsError) {
        logger.error("CMS statistics query failed", statsError instanceof Error ? statsError : new Error(String(statsError)));
        stats = [[], [], [], [], [], []];
      }

      response.statistics = {
        articles: {
          total: stats[0][0]?.count || 0,
          published: stats[1][0]?.count || 0,
          draft: stats[2][0]?.count || 0,
        },
        videos: {
          total: stats[3][0]?.count || 0,
          published: stats[4][0]?.count || 0,
          draft: stats[5][0]?.count || 0,
        },
        total: {
          content: (stats[0][0]?.count || 0) + (stats[3][0]?.count || 0),
          published: (stats[1][0]?.count || 0) + (stats[4][0]?.count || 0),
          draft: (stats[2][0]?.count || 0) + (stats[5][0]?.count || 0),
        },
      };
    }

    logger.info('CMS content retrieved successfully', {
      api: true,
      cms: true,
      content: true,
      isPublic,
      userRole: user?.role,
      itemCount: combinedContent.length,
      type,
      status: effectiveStatus,
      limit
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error("CMS content retrieval failed", error instanceof Error ? error : new Error(String(error)), {
      api: true,
      cms: true,
      content: true,
      operation: "get_cms_content",
    });

    return NextResponse.json(
      {
        success: false,
        error: "CMS content loading failed",
        details: process.env.NODE_ENV === "development"
          ? (error instanceof Error ? error.message : "Unknown error")
          : "Server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle template creation
    if (action === "template") {
      return await handleTemplateCreation(request);
    }

    // Handle content creation (placeholder for future implementation)
    return NextResponse.json({
      success: false,
      error: "Invalid action. Use: template"
    }, { status: 400 });

  } catch (error: unknown) {
    logger.error("CMS content POST error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleTemplateCreation(request: NextRequest) {
  const body = await request.json();
  const validatedData = createTemplateSchema.parse(body);
  const { templateId, contentId, contentType, patientData } = validatedData;

  // Enhanced templates for general reminders
  const enhancedTemplates = [
    {
      id: "motivation_with_video",
      template: "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
      variables: ["{nama}", "{video_url}"],
    },
    {
      id: "nutrition_reminder",
      template: "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
      variables: ["{nama}", "{artikel_url}"],
    },
    {
      id: "exercise_motivation",
      template: "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
      variables: ["{nama}", "{video_url}"],
    },
    {
      id: "general_reminder",
      template: "Halo {nama}! ⏰\n\nIni adalah pengingat untuk Anda. {customMessage}\n\nJangan lupa dilakukan ya! 💙 Tim PRIMA",
      variables: ["{nama}", "{customMessage}"],
    },
    {
      id: "wellness_check",
      template: "Halo {nama}! 💙\n\nBagaimana kabar Anda hari ini? {customMessage}\n\nKami siap membantu jika ada yang dibutuhkan. 🙏 Tim PRIMA",
      variables: ["{nama}", "{customMessage}"],
    },
  ];

  const selectedTemplate = enhancedTemplates.find((t) => t.id === templateId);
  if (!selectedTemplate) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  // Get content URL
  let contentUrl = "";
  if (contentId && contentType) {
    if (contentType === "article") {
      const article = await db
        .select({ slug: cmsArticles.slug })
        .from(cmsArticles)
        .where(eq(cmsArticles.id, contentId))
        .limit(1);

      if (article.length > 0) {
        contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article[0].slug}`;
      }
    } else if (contentType === "video") {
      const video = await db
        .select({ slug: cmsVideos.slug })
        .from(cmsVideos)
        .where(eq(cmsVideos.id, contentId))
        .limit(1);

      if (video.length > 0) {
        contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video[0].slug}`;
      }
    }
  }

  // Replace variables in template
  let finalMessage = selectedTemplate.template;

  // Replace patient variables
  if (patientData) {
    Object.keys(patientData).forEach((key) => {
      const placeholder = `{${key}}`;
      if (finalMessage.includes(placeholder)) {
        finalMessage = finalMessage.replaceAll(
          placeholder,
          patientData[key] || ""
        );
      }
    });
  }

  // Replace content URLs
  finalMessage = finalMessage.replaceAll(/{artikel_url}/g, contentUrl);
  finalMessage = finalMessage.replaceAll(/{video_url}/g, contentUrl);

  return NextResponse.json({
    success: true,
    data: {
      message: finalMessage,
      contentUrl,
      template: selectedTemplate,
    },
  });
}