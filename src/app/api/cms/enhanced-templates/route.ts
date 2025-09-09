import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, cmsArticles, cmsVideos } from '@/db'
import { eq } from 'drizzle-orm'

// Enhanced reminder templates with CMS content integration
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Future: Add filtering by type and category from search params
    // const { searchParams } = new URL(request.url)
    // const type = searchParams.get('type') || 'all' // template, article, video, all

    // Enhanced template suggestions with content integration
    const enhancedTemplates = [
      {
        id: 'medication_with_article',
        name: 'Pengingat Obat + Artikel',
        category: 'EDUCATIONAL',
        template: 'Halo {nama}, saatnya minum obat {obat}! 💊\n\n📖 Baca tips kesehatan: {artikel_url}\n\nSemoga cepat sembuh! 🙏',
        variables: ['{nama}', '{obat}', '{artikel_url}'],
        description: 'Pengingat obat dengan link artikel edukasi'
      },
      {
        id: 'motivation_with_video',
        name: 'Motivasi + Video',
        category: 'EDUCATIONAL', 
        template: 'Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️',
        variables: ['{nama}', '{video_url}'],
        description: 'Pesan motivasi dengan video inspiratif'
      },
      {
        id: 'nutrition_reminder',
        name: 'Pengingat Nutrisi',
        category: 'EDUCATIONAL',
        template: 'Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊',
        variables: ['{nama}', '{artikel_url}'],
        description: 'Pengingat nutrisi dengan artikel panduan'
      },
      {
        id: 'exercise_motivation',
        name: 'Motivasi Olahraga',
        category: 'EDUCATIONAL',
        template: 'Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪',
        variables: ['{nama}', '{video_url}'],
        description: 'Motivasi olahraga dengan video panduan'
      }
    ]

    // Get published articles and videos for content suggestions
    const [articles, videos] = await Promise.all([
      db.select({
        id: cmsArticles.id,
        title: cmsArticles.title,
        slug: cmsArticles.slug,
        category: cmsArticles.category,
        excerpt: cmsArticles.excerpt
      })
      .from(cmsArticles)
      .where(eq(cmsArticles.status, 'published'))
      .limit(10),
      
      db.select({
        id: cmsVideos.id,
        title: cmsVideos.title,
        slug: cmsVideos.slug,
        category: cmsVideos.category,
        description: cmsVideos.description
      })
      .from(cmsVideos)
      .where(eq(cmsVideos.status, 'published'))
      .limit(10)
    ])

    return NextResponse.json({
      success: true,
      data: {
        enhancedTemplates,
        availableArticles: articles.map(article => ({
          ...article,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article.slug}`,
          type: 'article'
        })),
        availableVideos: videos.map(video => ({
          ...video,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video.slug}`,
          type: 'video'
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching enhanced templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create enhanced reminder with content
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, contentId, contentType, patientData } = body

    // Get the enhanced template
    const enhancedTemplates = [
      {
        id: 'medication_with_article',
        template: 'Halo {nama}, saatnya minum obat {obat}! 💊\n\n📖 Baca tips kesehatan: {artikel_url}\n\nSemoga cepat sembuh! 🙏',
        variables: ['{nama}', '{obat}', '{artikel_url}']
      },
      {
        id: 'motivation_with_video', 
        template: 'Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️',
        variables: ['{nama}', '{video_url}']
      }
    ]

    const selectedTemplate = enhancedTemplates.find(t => t.id === templateId)
    if (!selectedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get content URL
    let contentUrl = ''
    if (contentId && contentType) {
      if (contentType === 'article') {
        const article = await db
          .select({ slug: cmsArticles.slug })
          .from(cmsArticles)
          .where(eq(cmsArticles.id, contentId))
          .limit(1)
        
        if (article.length > 0) {
          contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article[0].slug}`
        }
      } else if (contentType === 'video') {
        const video = await db
          .select({ slug: cmsVideos.slug })
          .from(cmsVideos)
          .where(eq(cmsVideos.id, contentId))
          .limit(1)

        if (video.length > 0) {
          contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video[0].slug}`
        }
      }
    }

    // Replace variables in template
    let finalMessage = selectedTemplate.template
    
    // Replace patient variables
    if (patientData) {
      Object.keys(patientData).forEach(key => {
        const placeholder = `{${key}}`
        if (finalMessage.includes(placeholder)) {
          finalMessage = finalMessage.replace(new RegExp(placeholder, 'g'), patientData[key] || '')
        }
      })
    }

    // Replace content URLs
    finalMessage = finalMessage.replace(/{artikel_url}/g, contentUrl)
    finalMessage = finalMessage.replace(/{video_url}/g, contentUrl)

    return NextResponse.json({
      success: true,
      data: {
        message: finalMessage,
        contentUrl,
        template: selectedTemplate
      }
    })

  } catch (error) {
    console.error('Error creating enhanced reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}