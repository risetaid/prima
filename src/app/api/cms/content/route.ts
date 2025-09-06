import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsArticles, cmsVideos } from '@/db'
import { eq, desc, and, count, isNull } from 'drizzle-orm'

// GET - Combined content feed for dashboard overview
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, articles, videos
    const status = searchParams.get('status') || 'all' // all, draft, published, archived
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get articles (exclude deleted)
    let articles: Array<{id: string; title: string; slug: string; category: string; status: string; publishedAt: Date | null; createdAt: Date; updatedAt: Date; type: 'article'}> = []
    if (type === 'all' || type === 'articles') {
      const articleConditions = [
        // Exclude soft-deleted articles
        isNull(cmsArticles.deletedAt)
      ]
      
      if (status !== 'all') {
        articleConditions.push(eq(cmsArticles.status, status as 'draft' | 'published' | 'archived'))
      }

      const articleResults = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          category: cmsArticles.category,
          status: cmsArticles.status,
          publishedAt: cmsArticles.publishedAt,
          createdAt: cmsArticles.createdAt,
          updatedAt: cmsArticles.updatedAt
        })
        .from(cmsArticles)
        .where(and(...articleConditions))
        .orderBy(desc(cmsArticles.updatedAt))
        .limit(type === 'articles' ? limit : Math.ceil(limit / 2))
      
      // Add type after query
      articles = articleResults.map(article => ({ ...article, type: 'article' as const }))
    }

    // Get videos (exclude deleted)
    let videos: Array<{id: string; title: string; slug: string; category: string; status: string; publishedAt: Date | null; createdAt: Date; updatedAt: Date; type: 'video'}> = []
    if (type === 'all' || type === 'videos') {
      const videoConditions = [
        // Exclude soft-deleted videos
        isNull(cmsVideos.deletedAt)
      ]
      
      if (status !== 'all') {
        videoConditions.push(eq(cmsVideos.status, status as 'draft' | 'published' | 'archived'))
      }

      const videoResults = await db
        .select({
          id: cmsVideos.id,
          title: cmsVideos.title,
          slug: cmsVideos.slug,
          category: cmsVideos.category,
          status: cmsVideos.status,
          publishedAt: cmsVideos.publishedAt,
          createdAt: cmsVideos.createdAt,
          updatedAt: cmsVideos.updatedAt
        })
        .from(cmsVideos)
        .where(and(...videoConditions))
        .orderBy(desc(cmsVideos.updatedAt))
        .limit(type === 'videos' ? limit : Math.ceil(limit / 2))
      
      // Add type after query
      videos = videoResults.map(video => ({ ...video, type: 'video' as const }))
    }

    // Combine and sort by updated date
    const combinedContent = [...articles, ...videos]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)

    // Get statistics with error handling (exclude deleted content)
    let stats
    try {
      console.log('📊 CMS: Starting statistics queries...')
      stats = await Promise.all([
        // Article stats (exclude deleted)
        db.select({ count: count() }).from(cmsArticles).where(isNull(cmsArticles.deletedAt)),
        db.select({ count: count() }).from(cmsArticles).where(and(eq(cmsArticles.status, 'published'), isNull(cmsArticles.deletedAt))),
        db.select({ count: count() }).from(cmsArticles).where(and(eq(cmsArticles.status, 'draft'), isNull(cmsArticles.deletedAt))),
        
        // Video stats (exclude deleted)
        db.select({ count: count() }).from(cmsVideos).where(isNull(cmsVideos.deletedAt)),
        db.select({ count: count() }).from(cmsVideos).where(and(eq(cmsVideos.status, 'published'), isNull(cmsVideos.deletedAt))),
        db.select({ count: count() }).from(cmsVideos).where(and(eq(cmsVideos.status, 'draft'), isNull(cmsVideos.deletedAt))),
      ])
      console.log('✅ CMS: Statistics queries successful')
    } catch (statsError) {
      console.error('❌ CMS: Statistics query failed:', statsError)
      // Fallback to zero stats if database queries fail
      stats = [[], [], [], [], [], []]
    }

    const statistics = {
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
      }
    }

    return NextResponse.json({
      success: true,
      data: combinedContent,
      statistics
    })

  } catch (error) {
    console.error('❌ CMS Content: Unexpected error:', error)
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    // Return more specific error information
    return NextResponse.json(
      { 
        success: false,
        error: 'CMS content loading failed',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Server error'
      },
      { status: 500 }
    )
  }
}