'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, User, Eye, ExternalLink, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { CMSContentListSkeleton } from '@/components/ui/dashboard-skeleton'

interface Article {
  id: string
  title: string
  slug: string
  excerpt?: string
  category: string
  status: 'published'
  publishedAt: string
  createdAt: string
  author?: string
}

export default function BeritaPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublishedArticles()
  }, [])

  const fetchPublishedArticles = async () => {
    try {
      console.log('📰 Berita: Fetching published articles...')
      
      const response = await fetch('/api/cms/content?type=articles&status=published&limit=20')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch articles`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Filter only published articles for Members
        const publishedArticles = data.data.filter((item: any) => 
          item.type === 'article' && item.status === 'published'
        )
        setArticles(publishedArticles)
        console.log(`✅ Berita: Loaded ${publishedArticles.length} published articles`)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('❌ Berita: Failed to load articles:', error)
      setError(error instanceof Error ? error.message : 'Failed to load articles')
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
      'kesehatan': 'bg-green-100 text-green-800',
      'nutrisi': 'bg-orange-100 text-orange-800',
      'olahraga': 'bg-blue-100 text-blue-800',
      'mental': 'bg-purple-100 text-purple-800',
      'pengobatan': 'bg-red-100 text-red-800',
      'default': 'bg-gray-100 text-gray-800'
    }
    return colors[category.toLowerCase()] || colors.default
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
              <div className="h-6 w-24 bg-gray-300 rounded animate-pulse"></div>
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
              <h1 className="text-2xl font-bold text-blue-600">Berita</h1>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
            <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Berita</h1>
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
            <h1 className="text-2xl font-bold text-blue-600">📰 Berita & Artikel</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="px-4 py-6">
        {articles.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📰</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Artikel</h2>
            <p className="text-gray-600">
              Artikel kesehatan akan ditampilkan di sini ketika tersedia.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    📚 {articles.length} Artikel Kesehatan Tersedia
                  </h3>
                  <p className="text-sm text-gray-600">
                    Informasi terkini untuk mendukung perawatan kesehatan Anda
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((article) => (
                <Card key={article.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getCategoryColor(article.category)}>
                        {article.category}
                      </Badge>
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    </div>
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    {article.excerpt && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(article.publishedAt)}</span>
                      </div>
                      {article.author && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{article.author}</span>
                        </div>
                      )}
                    </div>

                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link 
                        href={`/content/articles/${article.slug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Baca Artikel</span>
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
                  💡 Tips Membaca Artikel Kesehatan
                </h3>
                <p className="text-gray-600 text-sm">
                  Artikel-artikel ini disediakan untuk membantu pemahaman Anda tentang kesehatan dan perawatan. 
                  Selalu konsultasikan dengan dokter untuk saran medis yang tepat sesuai kondisi Anda.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}