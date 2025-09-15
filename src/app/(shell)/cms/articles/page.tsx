'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, FileText, Eye, Edit, Trash2, Filter } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { toast } from 'sonner'
import { CMSContentListSkeleton } from '@/components/ui/dashboard-skeleton'
import { CMSBreadcrumb } from '@/components/ui/breadcrumb'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const categories = [
    { value: 'general', label: 'Umum' },
    { value: 'nutrisi', label: 'Nutrisi' },
    { value: 'olahraga', label: 'Olahraga' },
    { value: 'motivational', label: 'Motivasi' },
    { value: 'medical', label: 'Medis' },
    { value: 'faq', label: 'FAQ' },
    { value: 'testimoni', label: 'Testimoni' }
  ]

  const fetchArticles = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`/api/cms/articles?${params}`)
      const data = await response.json()

      if (data.success) {
        setArticles(data.data)
        setPagination(data.pagination)
      } else {
        console.warn('⚠️ Articles: API returned failure, might be missing database tables')
        toast.error('CMS belum dikonfigurasi. Hubungi administrator.')
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Koneksi bermasalah. Periksa internet Anda.')
      } else {
        toast.error('CMS belum siap. Hubungi administrator.')
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, categoryFilter, statusFilter])

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/cms/articles/${deleteId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()

      if (data.success) {
        toast.success('Artikel berhasil dihapus')
        setDeleteId(null)
        fetchArticles(pagination?.page || 1)
      } else {
        toast.error('Gagal menghapus artikel')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Terjadi kesalahan saat menghapus artikel')
    } finally {
      setDeleting(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchArticles(1)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setStatusFilter('')
  }

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

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
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <CMSBreadcrumb />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <BackButton text="Kembali ke CMS" variant="simple" className="text-sm" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Artikel
            </h1>
            <p className="text-gray-600 mt-2">
              Kelola artikel edukasi untuk pasien kanker paliatif
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/cms/articles/create">
            <Plus className="h-4 w-4 mr-2" />
            Artikel Baru
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Cari artikel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Cari
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Artikel</CardTitle>
          {pagination && (
            <CardDescription>
              Menampilkan {articles.length} dari {pagination.total} artikel
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">
              <CMSContentListSkeleton />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Belum ada artikel
              </h3>
              <p className="mt-2 text-gray-600">
                Mulai dengan membuat artikel edukasi pertama Anda.
              </p>
              <Button asChild className="mt-6">
                <Link href="/cms/articles/create">
                  Buat Artikel Pertama
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h3 className="text-xl font-semibold text-gray-900 truncate">
                          {article.title}
                        </h3>
                      </div>
                      
                      {article.excerpt && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge className={getStatusColor(article.status)}>
                          {article.status === 'published' && 'Published'}
                          {article.status === 'draft' && 'Draft'}
                          {article.status === 'archived' && 'Archived'}
                        </Badge>
                        <Badge variant="outline" className={getCategoryColor(article.category)}>
                          {categories.find(c => c.value === article.category)?.label || article.category}
                        </Badge>
                        {article.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="text-sm text-gray-500">
                        <span>Dibuat: {formatDate(article.createdAt)}</span>
                        {article.publishedAt && (
                          <span className="ml-4">
                            Published: {formatDate(article.publishedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {article.status === 'published' && (
                        <Button asChild variant="outline" size="sm">
                          <Link 
                            href={`/content/articles/${article.slug}`}
                            target="_blank"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/cms/articles/${article.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(article.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-700">
                Halaman {pagination.page} dari {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchArticles(pagination.page - 1)}
                  disabled={!pagination.hasPrev || loading}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchArticles(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Artikel</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus artikel ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

