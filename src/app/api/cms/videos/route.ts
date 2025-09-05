import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsVideos } from '@/db'
import { eq, desc, and, or, ilike, isNull } from 'drizzle-orm'
import { z } from 'zod'

// Validation schemas
const createVideoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long'),
  description: z.string().optional(),
  videoUrl: z.string().url('Invalid video URL'),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationMinutes: z.string().optional(),
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

// Utility function to extract YouTube/Vimeo video ID and generate embed URL
function processVideoUrl(url: string): { embedUrl: string, thumbnailUrl?: string } {
  // YouTube URL patterns
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  const youtubeMatch = url.match(youtubeRegex)
  
  if (youtubeMatch) {
    const videoId = youtubeMatch[1]
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
  }
  
  // Vimeo URL patterns
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/
  const vimeoMatch = url.match(vimeoRegex)
  
  if (vimeoMatch) {
    const videoId = vimeoMatch[1]
    return {
      embedUrl: `https://player.vimeo.com/video/${videoId}`
    }
  }
  
  // If it's already an embed URL or other format, return as-is
  return { embedUrl: url }
}

// GET - List videos with search and pagination
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
      // Exclude deleted videos
      isNull(cmsVideos.deletedAt)
    ]
    
    if (search) {
      whereConditions.push(
        or(
          ilike(cmsVideos.title, `%${search}%`),
          ilike(cmsVideos.description, `%${search}%`)
        )!
      )
    }
    
    if (category) {
      whereConditions.push(eq(cmsVideos.category, category as any))
    }
    
    if (status) {
      whereConditions.push(eq(cmsVideos.status, status as any))
    }

    const whereClause = and(...whereConditions)

    // Get videos with pagination
    const videos = await db
      .select()
      .from(cmsVideos)
      .where(whereClause)
      .orderBy(desc(cmsVideos.updatedAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const totalCount = await db
      .select({ count: cmsVideos.id })
      .from(cmsVideos)
      .where(whereClause)
    
    const total = totalCount.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: videos,
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
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new video
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = createVideoSchema.parse(body)
    
    // Process video URL to get embed URL and auto thumbnail
    const { embedUrl, thumbnailUrl: autoThumbnail } = processVideoUrl(validatedData.videoUrl)
    
    // Generate slug if not provided or auto-generate from title
    let slug = validatedData.slug || generateSlug(validatedData.title)
    
    // Ensure slug is unique
    let slugSuffix = 0
    let finalSlug = slug
    
    while (true) {
      const existingVideo = await db
        .select()
        .from(cmsVideos)
        .where(and(
          eq(cmsVideos.slug, finalSlug),
          isNull(cmsVideos.deletedAt)
        ))
        .limit(1)
      
      if (existingVideo.length === 0) break
      
      slugSuffix++
      finalSlug = `${slug}-${slugSuffix}`
    }

    // Create video
    const newVideo = {
      ...validatedData,
      slug: finalSlug,
      videoUrl: embedUrl,
      thumbnailUrl: validatedData.thumbnailUrl || autoThumbnail || null,
      createdBy: user.clerkId,
      publishedAt: validatedData.status === 'published' ? new Date() : null
    }

    const createdVideo = await db
      .insert(cmsVideos)
      .values(newVideo)
      .returning()

    return NextResponse.json({
      success: true,
      message: 'Video created successfully',
      data: createdVideo[0]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}