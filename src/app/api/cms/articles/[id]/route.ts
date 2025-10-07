import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { db, cmsArticles } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// GET - Get single article by ID
export const GET = createApiHandler(
  { auth: "required", params: schemas.uuidParam },
  async (_, { user, params }) => {
    // Only admins and developers can access articles management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    const article = await db
      .select()
      .from(cmsArticles)
      .where(and(eq(cmsArticles.id, id), isNull(cmsArticles.deletedAt)))
      .limit(1);

    if (article.length === 0) {
      throw new Error("Article not found");
    }

    logger.info('Article retrieved successfully', {
      articleId: id,
      title: article[0].title,
      accessedBy: user!.id
    });

    return {
      success: true,
      data: article[0],
    };
  }
);

// PUT - Update article
export const PUT = createApiHandler(
  { auth: "required", params: schemas.uuidParam, body: schemas.updateArticle },
  async (body, { user, params }) => {
    // Only admins and developers can update articles
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    // Check if article exists and is not deleted
    const existingArticle = await db
      .select()
      .from(cmsArticles)
      .where(and(eq(cmsArticles.id, id), isNull(cmsArticles.deletedAt)))
      .limit(1);

    if (existingArticle.length === 0) {
      throw new Error("Article not found");
    }

    // Type the body properly
    const updateBody = body as {
      title?: string;
      content?: string;
      excerpt?: string;
      slug?: string;
      category?: "GENERAL" | "NUTRITION" | "EXERCISE" | "MOTIVATIONAL" | "MEDICAL" | "FAQ";
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      featured?: boolean;
      tags?: string[];
    };

    // If slug is being updated, ensure it's unique
    if (updateBody.slug) {
      const slugConflict = await db
        .select()
        .from(cmsArticles)
        .where(
          and(
            eq(cmsArticles.slug, updateBody.slug),
            isNull(cmsArticles.deletedAt)
          )
        )
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        throw new Error("Slug already exists");
      }
    }

    // Prepare update data
    const updateData = {
      ...updateBody,
      updatedAt: new Date(),
      // Set publishedAt when status changes to published
      ...(updateBody.status === "PUBLISHED" &&
      existingArticle[0].status !== "PUBLISHED"
        ? { publishedAt: new Date() }
        : {}),
      // Clear publishedAt when status changes from published
      ...(updateBody.status !== "PUBLISHED" &&
      existingArticle[0].status === "PUBLISHED"
        ? { publishedAt: null }
        : {}),
    };

    // Update article
    const updatedArticle = await db
      .update(cmsArticles)
      .set(updateData)
      .where(eq(cmsArticles.id, id))
      .returning();

    logger.info('Article updated successfully', {
      articleId: id,
      title: updatedArticle[0].title,
      updatedBy: user!.id
    });

    return {
      success: true,
      message: "Article updated successfully",
      data: updatedArticle[0],
    };
  }
);

// DELETE - Soft delete article
export const DELETE = createApiHandler(
  { auth: "required", params: schemas.uuidParam },
  async (_, { user, params }) => {
    // Only admins and developers can delete articles
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    // Check if article exists and is not already deleted
    const existingArticle = await db
      .select()
      .from(cmsArticles)
      .where(and(eq(cmsArticles.id, id), isNull(cmsArticles.deletedAt)))
      .limit(1);

    if (existingArticle.length === 0) {
      throw new Error("Article not found");
    }

    // Soft delete article by setting deletedAt timestamp
    await db
      .update(cmsArticles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cmsArticles.id, id));

    logger.info('Article deleted successfully', {
      articleId: id,
      title: existingArticle[0].title,
      deletedBy: user!.id
    });

    return {
      success: true,
      message: "Article deleted successfully",
    };
  }
);
