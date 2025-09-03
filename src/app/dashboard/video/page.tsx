'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video, Calendar, User, Play, ExternalLink, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { CMSContentListSkeleton } from '@/components/ui/dashboard-skeleton'

interface VideoContent {
  id: string
  title: string
  slug: string
  excerpt?: string
  category: string
  status: 'published'
  publishedAt: string
  createdAt: string
  author?: string
  duration?: string
  thumbnail?: string
}

export default function VideoPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<VideoContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublishedVideos()
  }, [])

  const fetchPublishedVideos = async () => {
    try {
      console.log('🎥 Video: Fetching published videos...')
      
      const response = await fetch('/api/cms/content?type=videos&status=published&limit=20')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch videos`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Filter only published videos for Members
        const publishedVideos = data.data.filter((item: any) => 
          item.type === 'video' && item.status === 'published'
        )
        setVideos(publishedVideos)
        console.log(`✅ Video: Loaded ${publishedVideos.length} published videos`)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('❌ Video: Failed to load videos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'edukasi': 'bg-blue-100 text-blue-800',
      'motivasi': 'bg-green-100 text-green-800',
      'tutorial': 'bg-purple-100 text-purple-800',
      'olahraga': 'bg-orange-100 text-orange-800',
      'meditasi': 'bg-indigo-100 text-indigo-800',
      'default': 'bg-gray-100 text-gray-800'
    }
    return colors[category.toLowerCase()] || colors.default
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return null
    return `${duration} menit`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <div className="h-6 w-32 bg-gray-300 rounded animate-pulse"></div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="px-4 py-6">
          <CMSContentListSkeleton />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <h1 className="text-2xl font-bold text-blue-600">Video Edukasi</h1>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
            <Video className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Video</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Coba Lagi
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">🎥 Video Edukasi</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="px-4 py-6">
        {videos.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Video</h2>
            <p className="text-gray-600">
              Video edukasi kesehatan akan ditampilkan di sini ketika tersedia.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    🎬 {videos.length} Video Edukasi Tersedia
                  </h3>
                  <p className="text-sm text-gray-600">
                    Video motivasi dan edukasi untuk mendukung perawatan kesehatan Anda
                  </p>
                </div>
                <Video className="h-8 w-8 text-red-500" />
              </div>
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getCategoryColor(video.category)}>
                        {video.category}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {video.duration && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {formatDuration(video.duration)}
                          </span>
                        )}
                        <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {video.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    {video.excerpt && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {video.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(video.publishedAt)}</span>
                      </div>
                      {video.author && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{video.author}</span>
                        </div>
                      )}
                    </div>

                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link 
                        href={`/content/videos/${video.slug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>Tonton Video</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer Info */}
            <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎯 Tips Menonton Video Edukasi
                </h3>
                <p className="text-gray-600 text-sm">
                  Video-video ini dirancang untuk memberikan motivasi dan edukasi praktis dalam perawatan kesehatan. 
                  Tonton dengan tenang dan terapkan tips yang sesuai dengan kondisi Anda.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}