import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsArticles, cmsVideos, users } from '@/db'
import { eq, desc, and, isNull, sql } from 'drizzle-orm'

// GET - Public content API for all authenticated users to access published content
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated (but allow all roles)
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, articles, videos
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get published articles only (exclude deleted and drafts)
    let articles: Array<{
      id: string; 
      title: string; 
      slug: string; 
      excerpt?: string | null;
      category: string; 
      status: string; 
      publishedAt: Date | null; 
      createdAt: Date; 
      author?: string | null;
      type: 'article'
    }> = []
    
    if (type === 'all' || type === 'articles') {
      const articleResults = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          excerpt: cmsArticles.excerpt,
          category: cmsArticles.category,
          status: cmsArticles.status,
          publishedAt: cmsArticles.publishedAt,
          createdAt: cmsArticles.createdAt,
          // Join with users table to get proper names instead of Clerk IDs
          author: sql<string>`COALESCE(
            NULLIF(CONCAT(${users.firstName}, ' ', ${users.lastName}), ' '),
            ${users.email},
            ${cmsArticles.createdBy}
          )`.as('author'),
          featuredImageUrl: cmsArticles.featuredImageUrl
        })
        .from(cmsArticles)
        .leftJoin(users, eq(cmsArticles.createdBy, users.clerkId))
        .where(and(
          eq(cmsArticles.status, 'published'), // Only published content
          isNull(cmsArticles.deletedAt) // Exclude deleted content
        ))
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(type === 'articles' ? limit : Math.ceil(limit / 2))
      
      articles = articleResults.map(article => ({ ...article, type: 'article' as const }))
    }

    // Get published videos only (exclude deleted and drafts)
    let videos: Array<{
      id: string; 
      title: string; 
      slug: string; 
      description?: string | null;
      category: string; 
      status: string; 
      publishedAt: Date | null; 
      createdAt: Date; 
      author?: string | null;
      durationMinutes?: string | null;
      thumbnailUrl?: string | null;
      type: 'video'
    }> = []
    
    if (type === 'all' || type === 'videos') {
      const videoResults = await db
        .select({
          id: cmsVideos.id,
          title: cmsVideos.title,
          slug: cmsVideos.slug,
          description: cmsVideos.description,
          category: cmsVideos.category,
          status: cmsVideos.status,
          publishedAt: cmsVideos.publishedAt,
          createdAt: cmsVideos.createdAt,
          // Join with users table to get proper names instead of Clerk IDs
          author: sql<string>`COALESCE(
            NULLIF(CONCAT(${users.firstName}, ' ', ${users.lastName}), ' '),
            ${users.email},
            ${cmsVideos.createdBy}
          )`.as('author'),
          durationMinutes: cmsVideos.durationMinutes,
          thumbnailUrl: cmsVideos.thumbnailUrl
        })
        .from(cmsVideos)
        .leftJoin(users, eq(cmsVideos.createdBy, users.clerkId))
        .where(and(
          eq(cmsVideos.status, 'published'), // Only published content
          isNull(cmsVideos.deletedAt) // Exclude deleted content
        ))
        .orderBy(desc(cmsVideos.publishedAt))
        .limit(type === 'videos' ? limit : Math.ceil(limit / 2))
      
      videos = videoResults.map(video => ({ ...video, type: 'video' as const }))
    }

    // Combine and sort by published date
    const combinedContent = [...articles, ...videos]
      .sort((a, b) => {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
        return bDate - aDate
      })
      .slice(0, limit)

    console.log(`✅ Public Content: Returned ${combinedContent.length} published items for user ${user.role}`)

    return NextResponse.json({
      success: true,
      data: combinedContent,
      total: combinedContent.length
    })

  } catch (error) {
    console.error('❌ Public Content: Unexpected error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load published content',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Server error'
      },
      { status: 500 }
    )
  }
}