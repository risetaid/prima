import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db, cmsArticles } from '@/db'
import { eq } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Tag, Share, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string) {
  const article = await db
    .select()
    .from(cmsArticles)
    .where(eq(cmsArticles.slug, slug))
    .limit(1)

  if (article.length === 0 || article[0].status !== 'published') {
    return null
  }

  return article[0]
}

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
      general: 'bg-blue-100 text-blue-800 border-blue-200',
      nutrisi: 'bg-green-100 text-green-800 border-green-200',
      olahraga: 'bg-purple-100 text-purple-800 border-purple-200',
      motivational: 'bg-orange-100 text-orange-800 border-orange-200',
      medical: 'bg-red-100 text-red-800 border-red-200',
      faq: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      testimoni: 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      general: 'Umum',
      nutrisi: 'Nutrisi',
      olahraga: 'Olahraga',
      motivational: 'Motivasi',
      medical: 'Medis',
      faq: 'FAQ',
      testimoni: 'Testimoni'
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || 'Artikel edukasi kesehatan dari PRIMA',
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link artikel telah disalin!')
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/cms" className="flex items-center gap-2 text-blue-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Kembali</span>
            </Link>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="h-4 w-4 mr-2" />
              Bagikan
            </Button>
          </div>
        </div>
      </header>

      {/* Article content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
              <p className="text-lg text-gray-600 leading-relaxed">
                {article.excerpt}
              </p>
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
        {article.featuredImageUrl && (
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
                className="whitespace-pre-wrap text-gray-900 leading-relaxed"
                style={{ 
                  fontSize: '18px', 
                  lineHeight: '1.7',
                  fontFamily: 'system-ui, -apple-system, sans-serif' 
                }}
              >
                {article.content}
              </div>
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
              <Button onClick={handleShare} className="shrink-0">
                <Share className="h-4 w-4 mr-2" />
                Bagikan Artikel
              </Button>
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