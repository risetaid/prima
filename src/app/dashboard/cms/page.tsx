'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FileText, Video, TrendingUp, Clock, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ContentItem {
  id: string
  title: string
  slug: string
  category: string
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  type: 'article' | 'video'
}

interface Statistics {
  articles: {
    total: number
    published: number
    draft: number
  }
  videos: {
    total: number
    published: number
    draft: number
  }
  total: {
    content: number
    published: number
    draft: number
  }
}

export default function CMSPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/cms/content?type=${activeTab}`)
      const data = await response.json()

      if (data.success) {
        setContent(data.data)
        setStatistics(data.statistics)
      } else {
        toast.error('Gagal memuat konten')
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      toast.error('Terjadi kesalahan saat memuat konten')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [activeTab])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manajemen Konten
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola artikel dan video edukasi untuk pasien kanker paliatif
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/cms/articles/create">
              <Plus className="h-4 w-4 mr-2" />
              Artikel Baru
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/cms/videos/create">
              <Video className="h-4 w-4 mr-2" />
              Video Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Konten
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total.content}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.articles.total} artikel, {statistics.videos.total} video
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Konten Published
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.total.published}</div>
              <p className="text-xs text-muted-foreground">
                Dapat dilihat publik
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Draft
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statistics.total.draft}</div>
              <p className="text-xs text-muted-foreground">
                Belum dipublikasikan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Artikel
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.articles.total}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.articles.published} published
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Konten Terbaru</CardTitle>
          <CardDescription>
            Kelola dan review konten yang telah dibuat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Semua Konten</TabsTrigger>
              <TabsTrigger value="articles">Artikel</TabsTrigger>
              <TabsTrigger value="videos">Video</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {content.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Belum ada konten
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Mulai dengan membuat artikel atau video edukasi pertama Anda.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Button asChild>
                      <Link href="/dashboard/cms/articles/create">
                        Buat Artikel
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/cms/videos/create">
                        Tambah Video
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {content.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {item.type === 'article' ? (
                              <FileText className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Video className="h-4 w-4 text-red-500" />
                            )}
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {item.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={getStatusColor(item.status)}>
                              {item.status === 'published' && 'Published'}
                              {item.status === 'draft' && 'Draft'}
                              {item.status === 'archived' && 'Archived'}
                            </Badge>
                            <Badge variant="outline" className={getCategoryColor(item.category)}>
                              {item.category}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-500">
                            <span>Dibuat: {formatDate(item.createdAt)}</span>
                            {item.updatedAt !== item.createdAt && (
                              <span className="ml-4">
                                Diubah: {formatDate(item.updatedAt)}
                              </span>
                            )}
                            {item.status === 'published' && item.publishedAt && (
                              <span className="ml-4">
                                Published: {formatDate(item.publishedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {item.status === 'published' && (
                            <Button asChild variant="outline" size="sm">
                              <Link 
                                href={`/content/${item.type === 'article' ? 'articles' : 'videos'}/${item.slug}`}
                                target="_blank"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link 
                              href={`/dashboard/cms/${item.type === 'article' ? 'articles' : 'videos'}/${item.id}/edit`}
                            >
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}