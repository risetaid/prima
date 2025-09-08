import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsArticles } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updates
const updateArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  category: z.enum(['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni']).optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

// GET - Get single article by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const article = await db
      .select()
      .from(cmsArticles)
      .where(and(
        eq(cmsArticles.id, id),
        isNull(cmsArticles.deletedAt)
      ))
      .limit(1)

    if (article.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: article[0]
    })

  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateArticleSchema.parse(body)
    
    // Check if article exists and is not deleted
    const existingArticle = await db
      .select()
      .from(cmsArticles)
      .where(and(
        eq(cmsArticles.id, id),
        isNull(cmsArticles.deletedAt)
      ))
      .limit(1)

    if (existingArticle.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // If slug is being updated, ensure it's unique
    if (validatedData.slug) {
      const slugConflict = await db
        .select()
        .from(cmsArticles)
        .where(and(
          eq(cmsArticles.slug, validatedData.slug),
          isNull(cmsArticles.deletedAt)
        ))
        .limit(1)
      
      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      // Set publishedAt when status changes to published
      ...(validatedData.status === 'published' && existingArticle[0].status !== 'published' 
        ? { publishedAt: new Date() } 
        : {}
      ),
      // Clear publishedAt when status changes from published
      ...(validatedData.status !== 'published' && existingArticle[0].status === 'published'
        ? { publishedAt: null }
        : {}
      )
    }

    // Update article
    const updatedArticle = await db
      .update(cmsArticles)
      .set(updateData)
      .where(eq(cmsArticles.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      data: updatedArticle[0]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if article exists and is not already deleted
    const existingArticle = await db
      .select()
      .from(cmsArticles)
      .where(and(
        eq(cmsArticles.id, id),
        isNull(cmsArticles.deletedAt)
      ))
      .limit(1)

    if (existingArticle.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Soft delete article by setting deletedAt timestamp
    await db
      .update(cmsArticles)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cmsArticles.id, id))

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}