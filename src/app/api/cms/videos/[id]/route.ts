import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsVideos } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updates
const updateVideoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long').optional(),
  description: z.string().optional(),
  videoUrl: z.string().url('Invalid video URL').optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationMinutes: z.string().optional(),
  category: z.enum(['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni']).optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

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

// GET - Get single video by ID
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

    const video = await db
      .select()
      .from(cmsVideos)
      .where(and(
        eq(cmsVideos.id, id),
        isNull(cmsVideos.deletedAt)
      ))
      .limit(1)

    if (video.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: video[0]
    })

  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update video
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
    const validatedData = updateVideoSchema.parse(body)
    
    // Check if video exists and is not deleted
    const existingVideo = await db
      .select()
      .from(cmsVideos)
      .where(and(
        eq(cmsVideos.id, id),
        isNull(cmsVideos.deletedAt)
      ))
      .limit(1)

    if (existingVideo.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // If slug is being updated, ensure it's unique
    if (validatedData.slug) {
      const slugConflict = await db
        .select()
        .from(cmsVideos)
        .where(and(
          eq(cmsVideos.slug, validatedData.slug),
          isNull(cmsVideos.deletedAt)
        ))
        .limit(1)
      
      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        )
      }
    }

    // Process video URL if provided
    let processedVideoData = {}
    if (validatedData.videoUrl) {
      const { embedUrl, thumbnailUrl: autoThumbnail } = processVideoUrl(validatedData.videoUrl)
      processedVideoData = {
        videoUrl: embedUrl,
        // Only update thumbnail if it's not explicitly provided and we have an auto-generated one
        ...((!validatedData.thumbnailUrl && autoThumbnail) ? { thumbnailUrl: autoThumbnail } : {})
      }
    }

    // Prepare update data
    const updateData = {
      ...validatedData,
      ...processedVideoData,
      updatedAt: new Date(),
      // Set publishedAt when status changes to published
      ...(validatedData.status === 'published' && existingVideo[0].status !== 'published' 
        ? { publishedAt: new Date() } 
        : {}
      ),
      // Clear publishedAt when status changes from published
      ...(validatedData.status !== 'published' && existingVideo[0].status === 'published'
        ? { publishedAt: null }
        : {}
      )
    }

    // Update video
    const updatedVideo = await db
      .update(cmsVideos)
      .set(updateData)
      .where(eq(cmsVideos.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      message: 'Video updated successfully',
      data: updatedVideo[0]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete video
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

    // Check if video exists and is not already deleted
    const existingVideo = await db
      .select()
      .from(cmsVideos)
      .where(and(
        eq(cmsVideos.id, id),
        isNull(cmsVideos.deletedAt)
      ))
      .limit(1)

    if (existingVideo.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Soft delete video by setting deletedAt timestamp
    await db
      .update(cmsVideos)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cmsVideos.id, id))

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}