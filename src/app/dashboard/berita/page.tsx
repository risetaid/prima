'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Calendar, User, Eye, ExternalLink, ArrowLeft, Search, Filter, Grid, List } from 'lucide-react'
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
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchPublishedArticles()
  }, [])

  useEffect(() => {
    filterArticles()
  }, [articles, searchTerm, selectedCategory])

  const filterArticles = () => {
    let filtered = articles

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory)
    }

    setFilteredArticles(filtered)
  }

  const getUniqueCategories = () => {
    const categories = articles.map(article => article.category)
    return Array.from(new Set(categories))
  }

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
      'general': 'bg-blue-100 text-blue-800 border-blue-200',
      'nutrisi': 'bg-green-100 text-green-800 border-green-200',
      'olahraga': 'bg-purple-100 text-purple-800 border-purple-200',
      'motivational': 'bg-orange-100 text-orange-800 border-orange-200',
      'medical': 'bg-red-100 text-red-800 border-red-200',
      'faq': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'testimoni': 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'general': 'Umum',
      'nutrisi': 'Nutrisi',
      'olahraga': 'Olahraga',
      'motivational': 'Motivasi',
      'medical': 'Medis',
      'faq': 'FAQ',
      'testimoni': 'Testimoni'
    }
    return labels[category.toLowerCase()] || category
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
      {/* Modern Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <div className="flex items-center space-x-2">
                <FileText className="w-7 h-7 text-blue-600" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Artikel Kesehatan</h1>
                  <p className="text-sm text-gray-600 hidden sm:block">Informasi dan edukasi terpercaya</p>
                </div>
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {articles.length === 0 && !loading ? (
          // Empty State
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Belum Ada Artikel</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Artikel kesehatan akan ditampilkan di sini ketika tersedia. Silakan cek kembali nanti.
            </p>
          </div>
        ) : (
          <>
            {/* Stats & Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {filteredArticles.length} Artikel Tersedia
                    </h3>
                    <p className="text-gray-600">
                      {filteredArticles.length < articles.length 
                        ? `Menampilkan ${filteredArticles.length} dari ${articles.length} artikel`
                        : 'Semua artikel kesehatan terkini'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 min-w-0 sm:min-w-96">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Cari artikel..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200"
                    />
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-50 border-gray-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {getUniqueCategories().map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex border rounded-lg bg-gray-50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-l-lg transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-r-lg transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Articles Display */}
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada artikel ditemukan</h3>
                <p className="text-gray-600">Coba ubah kata kunci pencarian atau filter kategori</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filteredArticles.map((article) => (
                  viewMode === 'grid' ? (
                    <Card key={article.id} className="bg-white hover:shadow-xl transition-all duration-200 border-0 shadow-md overflow-hidden group">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className={`${getCategoryColor(article.category)} text-xs font-medium border`}>
                            {getCategoryLabel(article.category)}
                          </Badge>
                          <FileText className="h-5 w-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {article.excerpt && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {article.excerpt}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(article.publishedAt)}</span>
                          </div>
                          {article.author && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-20">{article.author}</span>
                            </div>
                          )}
                        </div>

                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
                  ) : (
                    <Card key={article.id} className="bg-white hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <FileText className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                                    {article.title}
                                  </h3>
                                  <Badge className={`${getCategoryColor(article.category)} text-xs ml-3 flex-shrink-0`}>
                                    {getCategoryLabel(article.category)}
                                  </Badge>
                                </div>
                                {article.excerpt && (
                                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                    {article.excerpt}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(article.publishedAt)}</span>
                                  </div>
                                  {article.author && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{article.author}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Link 
                                href={`/content/articles/${article.slug}`}
                                target="_blank"
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Baca</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            )}

            {/* Educational Footer */}
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
              <div className="text-center max-w-3xl mx-auto">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Tips Membaca Artikel Kesehatan
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Artikel-artikel ini telah disusun oleh tim medis berpengalaman untuk memberikan informasi kesehatan yang akurat dan mudah dipahami. 
                  <strong className="text-blue-700"> Selalu konsultasikan dengan dokter</strong> untuk mendapatkan saran medis yang tepat sesuai dengan kondisi kesehatan Anda.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-white rounded-full text-sm text-blue-700 border border-blue-200">✓ Informasi Terpercaya</span>
                  <span className="px-3 py-1 bg-white rounded-full text-sm text-blue-700 border border-blue-200">✓ Tim Medis Profesional</span>
                  <span className="px-3 py-1 bg-white rounded-full text-sm text-blue-700 border border-blue-200">✓ Mudah Dipahami</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}