import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db, cmsArticles } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Tag, Clock } from 'lucide-react'
import Image from 'next/image'
import { ContentHeader } from '@/components/content/ContentHeader'
import { ShareButton } from '@/components/content/ShareButton'

import { logger } from '@/lib/logger';
interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

// Generate static paths for all published articles
export async function generateStaticParams() {
  try {
    const articles = await db
      .select({ slug: cmsArticles.slug })
      .from(cmsArticles)
      .where(and(
        eq(cmsArticles.status, 'PUBLISHED'),
        isNull(cmsArticles.deletedAt)
      ))
      .limit(100) // Limit for build performance
    
    return articles.map((article) => ({
      slug: article.slug,
    }))
  } catch (error: unknown) {
    logger.error('Error generating static params for articles:', error instanceof Error ? error : new Error(String(error)))
    return []
  }
}

async function getArticle(slug: string) {
  const article = await db
    .select({
      id: cmsArticles.id,
      title: cmsArticles.title,
      slug: cmsArticles.slug,
      content: cmsArticles.content,
      excerpt: cmsArticles.excerpt,
      featuredImageUrl: cmsArticles.featuredImageUrl,
      category: cmsArticles.category,
      tags: cmsArticles.tags,
      seoTitle: cmsArticles.seoTitle,
      seoDescription: cmsArticles.seoDescription,
      status: cmsArticles.status,
      publishedAt: cmsArticles.publishedAt,
      createdAt: cmsArticles.createdAt,
      updatedAt: cmsArticles.updatedAt
    })
    .from(cmsArticles)
    .where(and(
      eq(cmsArticles.slug, slug),
      eq(cmsArticles.status, 'PUBLISHED'),
      isNull(cmsArticles.deletedAt)
    ))
    .limit(1)

  if (article.length === 0) {
    return null
  }

  logger.info('🖼️ Article data:', {
    slug,
    featuredImageUrl: article[0].featuredImageUrl,
    hasImage: !!article[0].featuredImageUrl
  })

  return article[0]
}

// Enable ISR with 1 hour revalidation
export const revalidate = 3600 // 1 hour in seconds

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return {
      title: 'Artikel Tidak Ditemukan',
    }
  }

  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt || 'Artikel edukasi kesehatan dari PRIMA',
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || 'Artikel edukasi kesehatan dari PRIMA',
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      authors: ['PRIMA Healthcare'],
      images: article.featuredImageUrl ? [
        {
          url: article.featuredImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || 'Artikel edukasi kesehatan dari PRIMA',
      images: article.featuredImageUrl ? [article.featuredImageUrl] : [],
    },
    keywords: article.tags.join(', '),
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      GENERAL: 'bg-blue-100 text-blue-800 border-blue-200',
      NUTRITION: 'bg-green-100 text-green-800 border-green-200',
      EXERCISE: 'bg-purple-100 text-purple-800 border-purple-200',
      MOTIVATIONAL: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDICAL: 'bg-red-100 text-red-800 border-red-200',
      FAQ: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      GENERAL: 'Umum',
      NUTRITION: 'Nutrisi',
      EXERCISE: 'Olahraga',
      MOTIVATIONAL: 'Motivasi',
      MEDICAL: 'Medis',
      FAQ: 'FAQ',
    }
    return labels[category as keyof typeof labels] || category
  }

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }


  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Mobile-optimized header */}
      <div className="relative z-10">
        <ContentHeader
          title={article.title}
          text={article.excerpt || 'Artikel edukasi kesehatan dari PRIMA'}
        />
      </div>

      {/* Article content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Article header */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Category and tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getCategoryColor(article.category)}>
                {getCategoryLabel(article.category)}
              </Badge>
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <div 
                className="text-lg text-gray-600 leading-relaxed [&_strong]:font-bold [&_em]:italic [&_u]:underline"
                dangerouslySetInnerHTML={{ 
                  __html: article.excerpt.replace(/\n/g, '<br />').replace(/\s+/g, ' ') 
                }}
              />
            )}

            {/* Meta information */}
            <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
              {article.publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{Math.ceil(article.content.length / 1000)} min baca</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured image */}
        {article.featuredImageUrl && article.featuredImageUrl.trim() !== '' && !article.featuredImageUrl.startsWith('blob:') && (
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={article.featuredImageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Article content */}
        <Card>
          <CardContent className="p-6">
            <div className="prose prose-lg max-w-none">
              <div 
                className="text-gray-900 leading-relaxed [&_p]:mb-4 [&_p]:text-gray-900 [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_ol]:list-decimal [&_ol]:ml-6 [&_ul]:list-disc [&_ul]:ml-6 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-900 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-gray-900"
                style={{ 
                  fontSize: '18px', 
                  lineHeight: '1.7',
                  fontFamily: 'system-ui, -apple-system, sans-serif' 
                }}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer with sharing */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">PRIMA Healthcare</p>
                <p>Sistem pengingat obat untuk pasien kanker paliatif</p>
              </div>
              <ShareButton 
                title={article.title}
                text={article.excerpt || 'Artikel edukasi kesehatan dari PRIMA'}
                variant="default"
                className="shrink-0"
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt || article.seoDescription,
            image: article.featuredImageUrl,
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: {
              '@type': 'Organization',
              name: 'PRIMA Healthcare',
            },
            publisher: {
              '@type': 'Organization',
              name: 'PRIMA Healthcare',
              logo: {
                '@type': 'ImageObject',
                url: '/logo.png',
              },
            },
            keywords: article.tags.join(', '),
          }),
        }}
      />
    </div>
  )
}
