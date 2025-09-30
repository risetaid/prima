import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db, cmsArticles, cmsVideos } from '@/db'
import { eq, desc, and, or, ilike, isNull } from 'drizzle-orm'
import { getCachedData, setCachedData, CACHE_TTL } from '@/lib/cache'

import { logger } from '@/lib/logger';
// Interface for unified content response
interface UnifiedContent {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  tags: string[]
  publishedAt: Date | null
  createdAt: Date
  type: 'article' | 'video'
  thumbnailUrl?: string
  url: string // Public accessible URL
  excerpt?: string // For articles
  videoUrl?: string // For videos
  durationMinutes?: string // For videos
}

// GET - Fetch published content for attachment selection
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const type = searchParams.get('type') || 'all' // all, article, video
    
    const offset = (page - 1) * limit

    // Try to get from cache first
    const cacheKey = `published-content:${page}:${limit}:${search}:${category}:${type}`
    const cachedContent = await getCachedData(cacheKey)
    
    if (cachedContent) {
      return NextResponse.json(cachedContent)
    }

    // Get published articles (exclude deleted)
    let articles: UnifiedContent[] = []
    if (type === 'all' || type === 'article') {
      const articleConditions = [
        eq(cmsArticles.status, 'PUBLISHED'),
        isNull(cmsArticles.deletedAt)
      ]
      
      if (search) {
        const searchCondition = or(
          ilike(cmsArticles.title, `%${search}%`),
          ilike(cmsArticles.content, `%${search}%`),
          ilike(cmsArticles.excerpt, `%${search}%`)
        )
        if (searchCondition) {
          articleConditions.push(searchCondition)
        }
      }
      
      if (category && ['GENERAL', 'NUTRITION', 'EXERCISE', 'MOTIVATIONAL', 'MEDICAL', 'FAQ'].includes(category)) {
        articleConditions.push(eq(cmsArticles.category, category as 'GENERAL' | 'NUTRITION' | 'EXERCISE' | 'MOTIVATIONAL' | 'MEDICAL' | 'FAQ'))
      }

      const articleResults = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          excerpt: cmsArticles.excerpt,
          featuredImageUrl: cmsArticles.featuredImageUrl,
          category: cmsArticles.category,
          tags: cmsArticles.tags,
          publishedAt: cmsArticles.publishedAt,
          createdAt: cmsArticles.createdAt,
        })
        .from(cmsArticles)
        .where(and(...articleConditions))
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(type === 'article' ? limit : Math.ceil(limit / 2))
        .offset(type === 'article' ? offset : 0)
      
      articles = articleResults.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        description: article.excerpt || undefined,
        category: article.category,
        tags: article.tags,
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
        type: 'article' as const,
        thumbnailUrl: article.featuredImageUrl || undefined,
        url: `/content/articles/${article.slug}`,
        excerpt: article.excerpt || undefined,
      }))
    }

    // Get published videos (exclude deleted)
    let videos: UnifiedContent[] = []
    if (type === 'all' || type === 'video') {
      const videoConditions = [
        eq(cmsVideos.status, 'PUBLISHED'),
        isNull(cmsVideos.deletedAt)
      ]
      
      if (search) {
        const searchCondition = or(
          ilike(cmsVideos.title, `%${search}%`),
          ilike(cmsVideos.description, `%${search}%`)
        )
        if (searchCondition) {
          videoConditions.push(searchCondition)
        }
      }
      
      if (category && ['GENERAL', 'NUTRITION', 'EXERCISE', 'MOTIVATIONAL', 'MEDICAL', 'FAQ'].includes(category)) {
        videoConditions.push(eq(cmsVideos.category, category as 'GENERAL' | 'NUTRITION' | 'EXERCISE' | 'MOTIVATIONAL' | 'MEDICAL' | 'FAQ'))
      }

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
          publishedAt: cmsVideos.publishedAt,
          createdAt: cmsVideos.createdAt,
        })
        .from(cmsVideos)
        .where(and(...videoConditions))
        .orderBy(desc(cmsVideos.publishedAt))
        .limit(type === 'video' ? limit : Math.ceil(limit / 2))
        .offset(type === 'video' ? offset : 0)
      
      videos = videoResults.map(video => ({
        id: video.id,
        title: video.title,
        slug: video.slug,
        description: video.description || undefined,
        category: video.category,
        tags: video.tags,
        publishedAt: video.publishedAt,
        createdAt: video.createdAt,
        type: 'video' as const,
        thumbnailUrl: video.thumbnailUrl || undefined,
        url: `/content/videos/${video.slug}`,
        videoUrl: video.videoUrl,
        durationMinutes: video.durationMinutes || undefined,
      }))
    }

    // Combine and sort by published date
    const combinedContent = [...articles, ...videos]
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)

    // Get total counts for pagination
    const totalArticles = type === 'all' || type === 'article' ?
      await db.select().from(cmsArticles)
        .where(and(eq(cmsArticles.status, 'PUBLISHED'), isNull(cmsArticles.deletedAt))) : []

    const totalVideos = type === 'all' || type === 'video' ?
      await db.select().from(cmsVideos)
        .where(and(eq(cmsVideos.status, 'PUBLISHED'), isNull(cmsVideos.deletedAt))) : []

    const totalCount = totalArticles.length + totalVideos.length
    const hasMore = offset + limit < totalCount
    
    const response = {
      success: true,
      data: combinedContent,
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
    }

    // Cache the response for 15 minutes
    await setCachedData(cacheKey, response, CACHE_TTL.PATIENT)

    return NextResponse.json(response)

  } catch (error: unknown) {
    logger.error('Published content API error:', error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch published content',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : 
          'Server error'
      },
      { status: 500 }
    )
  }
}


