import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db, cmsArticles, cmsVideos } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'

// GET - Fetch unique categories from published content
export async function GET() {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unique categories from both articles and videos
    const [articleCategories, videoCategories] = await Promise.all([
      db
        .selectDistinct({ category: cmsArticles.category })
        .from(cmsArticles)
        .where(and(eq(cmsArticles.status, 'published'), isNull(cmsArticles.deletedAt))),
      
      db
        .selectDistinct({ category: cmsVideos.category })
        .from(cmsVideos)
        .where(and(eq(cmsVideos.status, 'published'), isNull(cmsVideos.deletedAt)))
    ])

    const allCategories = [
      ...articleCategories.map(c => c.category),
      ...videoCategories.map(c => c.category)
    ]

    const uniqueCategories = [...new Set(allCategories)]

    // Category labels for UI
    const categoryLabels: Record<string, string> = {
      general: 'Umum',
      nutrisi: 'Nutrisi',
      olahraga: 'Olahraga',
      motivational: 'Motivasi',
      medical: 'Medis',
      faq: 'FAQ',
      testimoni: 'Testimoni'
    }

    const categoriesWithLabels = uniqueCategories.map(category => ({
      value: category,
      label: categoryLabels[category] || category,
      icon: getCategoryIcon(category)
    }))

    return NextResponse.json({
      success: true,
      categories: categoriesWithLabels
    })

  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    general: '📋',
    nutrisi: '🥗',
    olahraga: '🏃‍♂️',
    motivational: '💪',
    medical: '⚕️',
    faq: '❓',
    testimoni: '💬'
  }
  return icons[category] || '📄'
}

