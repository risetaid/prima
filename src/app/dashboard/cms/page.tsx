'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FileText, Video, TrendingUp, Clock, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DashboardStatsCardsSkeleton, CMSContentListSkeleton } from '@/components/ui/dashboard-skeleton'
import { RoleGuard } from '@/components/auth/role-guard'
import Image from 'next/image'


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
  thumbnailUrl: string | null
  featuredImageUrl: string | null
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

function CMSPageContent() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Progressive loading: Statistics first, then content
  const fetchContent = async () => {
    try {
      console.log('🔍 CMS: Starting content fetch, activeTab:', activeTab)

      // Only fetch content, not statistics (statistics should remain static)
      setContentLoading(true)
      const contentResponse = await fetch(`/api/cms/content?type=${activeTab}`)
      console.log('🔍 CMS: Content response status:', contentResponse.status)

      if (!contentResponse.ok) {
        console.error('❌ CMS: Content API request failed:', contentResponse.status, contentResponse.statusText)

        if (contentResponse.status === 401) {
          toast.error('Tidak memiliki akses ke CMS. Hubungi administrator.')
        } else if (contentResponse.status === 403) {
          toast.error('Akses ditolak. Butuh role ADMIN atau SUPERADMIN.')
        } else if (contentResponse.status === 500) {
          toast.error('Server error. Silakan coba lagi nanti.')
        } else {
          toast.error(`HTTP ${contentResponse.status}: ${contentResponse.statusText}`)
        }
        return
      }

      const contentData = await contentResponse.json()
      console.log('✅ CMS: Content data received:', {
        success: contentData.success,
        contentCount: contentData.data?.length
      })

      if (contentData.success) {
        setContent(contentData.data || [])
      } else {
        console.error('❌ CMS: Content API returned error:', contentData.error)
        toast.error(contentData.error || 'Gagal memuat konten')
      }
    } catch (error) {
      console.error('❌ CMS: Content loading error:', error)

      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Koneksi bermasalah. Periksa internet Anda.')
      } else {
        toast.error('Terjadi kesalahan saat memuat konten')
      }
    } finally {
      setContentLoading(false)
      setLoading(false)
    }
  }

  // Load statistics only once on mount
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        console.log('🔍 CMS: Loading statistics (one-time)')
        setStatsLoading(true)
        const response = await fetch('/api/cms/content?type=all&limit=0&stats_only=true')

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.statistics) {
            setStatistics(data.statistics)
            console.log('✅ CMS: Statistics loaded (one-time)', data.statistics)
          }
        }
      } catch (error) {
        console.error('❌ CMS: Statistics loading error:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStatistics()
  }, []) // Empty dependency array - only run once on mount

  // Load content when tab changes
  useEffect(() => {
    if (statistics) { // Only fetch content after statistics are loaded
      fetchContent()
    }
  }, [activeTab, statistics])

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

  // Show progressive loading states
  if (loading && statsLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <DashboardStatsCardsSkeleton />

        {/* Content Tabs Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="grid w-full grid-cols-3 h-10 bg-gray-100 rounded">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 mx-1 my-1 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <CMSContentListSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      
       {/* Combined Layout: 2x3 Grid with Cards and Buttons */}
       {statsLoading ? (
         <DashboardStatsCardsSkeleton />
       ) : statistics ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
           {/* Row 1 */}
           <Card className="h-auto">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
               <CardTitle className="text-base font-semibold">
                 Total Konten
               </CardTitle>
               <FileText className="h-5 w-5 text-muted-foreground" />
             </CardHeader>
             <CardContent className="pt-2">
               <div className="text-3xl font-bold">{statistics.total.content}</div>
               <p className="text-sm text-muted-foreground">
                 {statistics.articles.total} artikel, {statistics.videos.total} video
               </p>
             </CardContent>
           </Card>

           <Card className="h-auto">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
               <CardTitle className="text-base font-semibold">
                 Terpublish
               </CardTitle>
               <Eye className="h-5 w-5 text-muted-foreground" />
             </CardHeader>
             <CardContent className="pt-2">
               <div className="text-3xl font-bold text-green-600">{statistics.total.published}</div>
               <p className="text-sm text-muted-foreground">
                 Dapat dilihat publik
               </p>
             </CardContent>
           </Card>

           <Card className="h-auto">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
               <CardTitle className="text-base font-semibold">
                 Draft
               </CardTitle>
               <Clock className="h-5 w-5 text-muted-foreground" />
             </CardHeader>
             <CardContent className="pt-2">
               <div className="text-3xl font-bold text-yellow-600">{statistics.total.draft}</div>
               <p className="text-sm text-muted-foreground">
                 Belum dipublikasikan
               </p>
             </CardContent>
           </Card>

           {/* Row 2 */}
           <Card className="h-auto">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
               <CardTitle className="text-base font-semibold">
                 Artikel
               </CardTitle>
               <TrendingUp className="h-5 w-5 text-muted-foreground" />
             </CardHeader>
             <CardContent className="pt-2">
               <div className="text-3xl font-bold">{statistics.articles.total}</div>
               <p className="text-sm text-muted-foreground">
                 {statistics.articles.published} published
               </p>
             </CardContent>
           </Card>

           <Card className="h-auto">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
               <CardTitle className="text-base font-semibold">
                 Video
               </CardTitle>
               <Video className="h-5 w-5 text-muted-foreground" />
             </CardHeader>
             <CardContent className="pt-2">
               <div className="text-3xl font-bold">{statistics.videos.total}</div>
               <p className="text-sm text-muted-foreground">
                 {statistics.videos.published} published
               </p>
             </CardContent>
           </Card>

           {/* Action Buttons Card */}
           <Card className="h-auto flex flex-col justify-center">
             <CardContent className="pt-6 pb-6">
               <div className="flex flex-col gap-4">
                 <Button asChild className="w-full h-12">
                   <Link href="/dashboard/cms/articles/create" className="flex items-center justify-center text-base">
                     <Plus className="h-5 w-5 mr-2" />
                     Artikel Baru
                   </Link>
                 </Button>
                 <Button asChild variant="outline" className="w-full h-12">
                   <Link href="/dashboard/cms/videos/create" className="flex items-center justify-center text-base">
                     <Video className="h-5 w-5 mr-2" />
                     Video Baru
                   </Link>
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
      ) : null}

      {/* Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Konten Terbaru</CardTitle>
          <CardDescription>
            Kelola dan review konten yang telah dibuat
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs value={activeTab} onValueChange={(value) => {
             console.log('🔄 CMS: Tab changed to:', value, '(current:', activeTab, ')');
             if (value !== activeTab) {
               setActiveTab(value);
             }
           }}>
             <TabsList className="grid w-full grid-cols-3 h-auto">
               <TabsTrigger value="all" className="text-xs sm:text-sm py-2">Semua</TabsTrigger>
               <TabsTrigger value="articles" className="text-xs sm:text-sm py-2">Artikel</TabsTrigger>
               <TabsTrigger value="videos" className="text-xs sm:text-sm py-2">Video</TabsTrigger>
             </TabsList>

             <TabsContent value={activeTab} className="mt-6">
              {contentLoading ? (
                <div className="py-6">
                  <CMSContentListSkeleton />
                </div>
              ) : content.length === 0 ? (
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
                   {content.map((item) => {
                     const thumbnailUrl = item.type === 'article' ? item.featuredImageUrl : item.thumbnailUrl

                     // Validate thumbnail URL
                     const isValidThumbnail = thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.trim() !== ''

                     return (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors relative"
                        >
                          <div className="flex gap-3 sm:gap-4 pr-24">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0">
                              {isValidThumbnail ? (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200">
                                  <Image
                                    src={thumbnailUrl}
                                    alt={item.title}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Hide broken images
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  {item.type === 'article' ? (
                                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                                  ) : (
                                    <Video className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {item.type === 'article' ? (
                                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
                                )}
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 line-clamp-2">
                                  {item.title}
                                </h3>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge className={`${getStatusColor(item.status)} text-xs`}>
                                  {item.status === 'published' && 'Published'}
                                  {item.status === 'draft' && 'Draft'}
                                  {item.status === 'archived' && 'Archived'}
                                </Badge>
                                <Badge variant="outline" className={`${getCategoryColor(item.category)} text-xs`}>
                                  {item.category}
                                </Badge>
                              </div>

                              <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                                <div>Dibuat: {formatDate(item.createdAt)}</div>
                                {item.updatedAt !== item.createdAt && (
                                  <div>Diubah: {formatDate(item.updatedAt)}</div>
                                )}
                                {item.status === 'published' && item.publishedAt && (
                                  <div>Published: {formatDate(item.publishedAt)}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons - Absolutely positioned at right */}
                          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-2">
                            {item.status === 'published' && (
                              <Button asChild variant="outline" size="sm" className="w-20">
                                <Link
                                  href={`/content/${item.type === 'article' ? 'articles' : 'videos'}/${item.slug}`}
                                  target="_blank"
                                  className="flex items-center justify-center"
                                >
                                  <Eye className="h-4 w-4 sm:mr-0 mr-2" />
                                  <span className="sm:hidden">Lihat</span>
                                </Link>
                              </Button>
                            )}
                            <Button asChild variant="outline" size="sm" className="w-20">
                              <Link
                                href={`/dashboard/cms/${item.type === 'article' ? 'articles' : 'videos'}/${item.id}/edit`}
                                className="flex items-center justify-center"
                              >
                                <span>Edit</span>
                              </Link>
                            </Button>
                          </div>
                        </div>
                     )
                   })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CMSPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
      <CMSPageContent />
    </RoleGuard>
  )
}