import { createApiHandler } from "@/lib/api-helpers";
import { z } from "zod";
import { schemas } from "@/lib/api-schemas";
import { db, cmsArticles } from "@/db";
import { eq, desc, and, or, ilike, isNull } from "drizzle-orm";
import { logger } from '@/lib/logger';

// Validation schemas
const createArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug too long"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal("")),
  category: z.enum([
    "GENERAL",
    "NUTRITION",
    "EXERCISE",
    "MOTIVATIONAL",
    "MEDICAL",
    "FAQ",
  ]),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

const articlesQuerySchema = z.object({
  category: z.enum([
    "GENERAL",
    "NUTRITION",
    "EXERCISE",
    "MOTIVATIONAL",
    "MEDICAL",
    "FAQ",
  ]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
}).merge(schemas.list);

// Utility function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
}

// GET /api/cms/articles - List articles with search and pagination
export const GET = createApiHandler(
  { auth: "required", query: articlesQuerySchema },
  async (_, { user, query }) => {
    // Only admins and developers can access articles management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Unauthorized");
    }

    const { page, limit, search, category, status } = query!;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [
      // Exclude deleted articles
      isNull(cmsArticles.deletedAt),
    ];

    if (search) {
      whereConditions.push(
        or(
          ilike(cmsArticles.title, `%${search}%`),
          ilike(cmsArticles.content, `%${search}%`),
          ilike(cmsArticles.excerpt, `%${search}%`)
        )!
      );
    }

    if (category) {
      whereConditions.push(
        eq(
          cmsArticles.category,
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
        eq(cmsArticles.status, status as "DRAFT" | "PUBLISHED" | "ARCHIVED")
      );
    }

    const whereClause = and(...whereConditions);

    // Get articles with pagination
    const articles = await db
      .select()
      .from(cmsArticles)
      .where(whereClause)
      .orderBy(desc(cmsArticles.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: cmsArticles.id })
      .from(cmsArticles)
      .where(whereClause);

    const total = totalCount.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
);

// POST /api/cms/articles - Create new article
export const POST = createApiHandler(
  { auth: "required", body: createArticleSchema },
  async (body, { user }) => {
    // Only admins and developers can create articles
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Unauthorized");
    }

    const validatedData = body;

    // Generate slug if not provided or auto-generate from title
    const slug = validatedData.slug || generateSlug(validatedData.title);

    // Ensure slug is unique
    let slugSuffix = 0;
    let finalSlug = slug;

    while (true) {
      const existingArticle = await db
        .select()
        .from(cmsArticles)
        .where(
          and(eq(cmsArticles.slug, finalSlug), isNull(cmsArticles.deletedAt))
        )
        .limit(1);

      if (existingArticle.length === 0) break;

      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    // Create article
    const newArticle = {
      ...validatedData,
      slug: finalSlug,
      createdBy: user!.clerkId,
      publishedAt: validatedData.status === "PUBLISHED" ? new Date() : null,
    };

    const createdArticle = await db
      .insert(cmsArticles)
      .values(newArticle)
      .returning();

    return {
      message: "Article created successfully",
      data: createdArticle[0],
    };
  }
);
