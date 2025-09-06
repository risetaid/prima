import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsArticles } from '@/db'
import { eq, desc, and, or, ilike, isNull } from 'drizzle-orm'
import { z } from 'zod'

// Validation schemas
const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  category: z.enum(['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni']),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft')
})

// Utility function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

// GET - List articles with search and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    
    const offset = (page - 1) * limit

    // Build where conditions
    const whereConditions = [
      // Exclude deleted articles
      isNull(cmsArticles.deletedAt)
    ]
    
    if (search) {
      whereConditions.push(
        or(
          ilike(cmsArticles.title, `%${search}%`),
          ilike(cmsArticles.content, `%${search}%`),
          ilike(cmsArticles.excerpt, `%${search}%`)
        )!
      )
    }
    
    if (category) {
      whereConditions.push(eq(cmsArticles.category, category as 'general' | 'nutrisi' | 'olahraga' | 'motivational' | 'medical' | 'faq' | 'testimoni'))
    }
    
    if (status) {
      whereConditions.push(eq(cmsArticles.status, status as 'draft' | 'published' | 'archived'))
    }

    const whereClause = and(...whereConditions)

    // Get articles with pagination
    const articles = await db
      .select()
      .from(cmsArticles)
      .where(whereClause)
      .orderBy(desc(cmsArticles.updatedAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const totalCount = await db
      .select({ count: cmsArticles.id })
      .from(cmsArticles)
      .where(whereClause)
    
    const total = totalCount.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new article
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = createArticleSchema.parse(body)
    
    // Generate slug if not provided or auto-generate from title
    const slug = validatedData.slug || generateSlug(validatedData.title)
    
    // Ensure slug is unique
    let slugSuffix = 0
    let finalSlug = slug
    
    while (true) {
      const existingArticle = await db
        .select()
        .from(cmsArticles)
        .where(and(
          eq(cmsArticles.slug, finalSlug),
          isNull(cmsArticles.deletedAt)
        ))
        .limit(1)
      
      if (existingArticle.length === 0) break
      
      slugSuffix++
      finalSlug = `${slug}-${slugSuffix}`
    }

    // Create article
    const newArticle = {
      ...validatedData,
      slug: finalSlug,
      createdBy: user.clerkId,
      publishedAt: validatedData.status === 'published' ? new Date() : null
    }

    const createdArticle = await db
      .insert(cmsArticles)
      .values(newArticle)
      .returning()

    return NextResponse.json({
      success: true,
      message: 'Article created successfully',
      data: createdArticle[0]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}