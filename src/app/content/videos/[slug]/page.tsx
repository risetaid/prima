import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db, cmsVideos } from '@/db'
import { eq } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Tag, Share, Clock, Play } from 'lucide-react'
import Link from 'next/link'

interface VideoPageProps {
  params: Promise<{ slug: string }>
}

async function getVideo(slug: string) {
  const video = await db
    .select()
    .from(cmsVideos)
    .where(eq(cmsVideos.slug, slug))
    .limit(1)

  if (video.length === 0 || video[0].status !== 'published') {
    return null
  }

  return video[0]
}

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { slug } = await params
  const video = await getVideo(slug)

  if (!video) {
    return {
      title: 'Video Tidak Ditemukan',
    }
  }

  return {
    title: video.seoTitle || video.title,
    description: video.seoDescription || video.description || 'Video edukasi kesehatan dari PRIMA',
    openGraph: {
      title: video.seoTitle || video.title,
      description: video.seoDescription || video.description || 'Video edukasi kesehatan dari PRIMA',
      type: 'video.other',
      images: video.thumbnailUrl ? [
        {
          url: video.thumbnailUrl,
          width: 1200,
          height: 630,
          alt: video.title,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: video.seoTitle || video.title,
      description: video.seoDescription || video.description || 'Video edukasi kesehatan dari PRIMA',
      images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
    },
    keywords: video.tags.join(', '),
  }
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { slug } = await params
  const video = await getVideo(slug)

  if (!video) {
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
          title: video.title,
          text: video.description || 'Video edukasi kesehatan dari PRIMA',
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
        alert('Link video telah disalin!')
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

      {/* Video content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Video header */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Category and tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getCategoryColor(video.category)}>
                {getCategoryLabel(video.category)}
              </Badge>
              {video.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              {video.title}
            </h1>

            {/* Meta information */}
            <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
              {video.publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(video.publishedAt)}</span>
                </div>
              )}
              {video.durationMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{video.durationMinutes}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video player */}
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={video.videoUrl}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Video description */}
        {video.description && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Deskripsi Video</h2>
              <div 
                className="whitespace-pre-wrap text-gray-900 leading-relaxed"
                style={{ 
                  fontSize: '16px', 
                  lineHeight: '1.6',
                  fontFamily: 'system-ui, -apple-system, sans-serif' 
                }}
              >
                {video.description}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips for watching */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tips Menonton</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start gap-3">
                <Play className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Tonton dengan nyaman</p>
                  <p className="text-sm text-gray-600">Pilih waktu yang tenang dan posisi yang nyaman untuk fokus pada video</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Terapkan secara bertahap</p>
                  <p className="text-sm text-gray-600">Jika ada instruksi, praktikkan secara perlahan dan konsisten</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Share className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Bagikan dengan keluarga</p>
                  <p className="text-sm text-gray-600">Video ini juga berguna untuk keluarga dan pendamping pasien</p>
                </div>
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
                Bagikan Video
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
            '@type': 'VideoObject',
            name: video.title,
            description: video.description || video.seoDescription,
            thumbnailUrl: video.thumbnailUrl,
            uploadDate: video.publishedAt?.toISOString(),
            duration: video.durationMinutes ? `PT${video.durationMinutes.replace(/[^\d]/g, '')}M` : undefined,
            embedUrl: video.videoUrl,
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
            keywords: video.tags.join(', '),
          }),
        }}
      />
    </div>
  )
}