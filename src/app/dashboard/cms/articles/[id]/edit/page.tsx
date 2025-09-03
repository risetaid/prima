'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Save, Eye, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import RichTextEditor from '@/components/cms/RichTextEditor'

const categories = [
  { value: 'general', label: 'Umum', color: 'bg-blue-100 text-blue-800' },
  { value: 'nutrisi', label: 'Nutrisi', color: 'bg-green-100 text-green-800' },
  { value: 'olahraga', label: 'Olahraga', color: 'bg-purple-100 text-purple-800' },
  { value: 'motivational', label: 'Motivasi', color: 'bg-orange-100 text-orange-800' },
  { value: 'medical', label: 'Medis', color: 'bg-red-100 text-red-800' },
  { value: 'faq', label: 'FAQ', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'testimoni', label: 'Testimoni', color: 'bg-pink-100 text-pink-800' }
]

interface ArticleEditPageProps {
  params: Promise<{ id: string }>
}

export default function ArticleEditPage({ params }: ArticleEditPageProps) {
  const router = useRouter()
  const [articleId, setArticleId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImageUrl: '',
    category: 'general',
    tags: [] as string[],
    seoTitle: '',
    seoDescription: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const resolvedParams = await params
        setArticleId(resolvedParams.id)
        
        console.log('🔍 Edit Article: Loading article', resolvedParams.id)
        const response = await fetch(`/api/cms/articles/${resolvedParams.id}`)
        
        if (!response.ok) {
          console.error('❌ Edit Article: API error:', response.status)
          if (response.status === 404) {
            toast.error('Artikel tidak ditemukan')
          } else if (response.status === 401) {
            toast.error('Tidak memiliki akses')
          } else {
            toast.error('Gagal memuat artikel')
          }
          router.push('/dashboard/cms')
          return
        }

        const data = await response.json()
        console.log('✅ Edit Article: Loaded', data.data)
        
        if (data.success) {
          const article = data.data
          setFormData({
            title: article.title || '',
            slug: article.slug || '',
            content: article.content || '',
            excerpt: article.excerpt || '',
            featuredImageUrl: article.featuredImageUrl || '',
            category: article.category || 'general',
            tags: article.tags || [],
            seoTitle: article.seoTitle || '',
            seoDescription: article.seoDescription || '',
            status: article.status || 'draft'
          })
        }
      } catch (error) {
        console.error('❌ Edit Article: Network error:', error)
        toast.error('Terjadi kesalahan saat memuat artikel')
        router.push('/dashboard/cms')
      } finally {
        setLoading(false)
      }
    }

    loadArticle()
  }, [params, router])

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Judul artikel wajib diisi')
      return
    }

    setSaving(true)

    try {
      console.log('💾 Edit Article: Saving changes...')
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          seoTitle: formData.seoTitle || formData.title,
          seoDescription: formData.seoDescription || formData.excerpt
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Edit Article: API error:', errorData)
        toast.error(errorData.error || 'Gagal menyimpan artikel')
        return
      }

      const data = await response.json()
      console.log('✅ Edit Article: Saved successfully')
      
      toast.success('Artikel berhasil diperbarui!')
      router.push('/dashboard/cms')
    } catch (error) {
      console.error('❌ Edit Article: Network error:', error)
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus artikel ini? Tindakan ini tidak dapat dibatalkan.')) {
      return
    }

    setDeleting(true)

    try {
      console.log('🗑️ Edit Article: Deleting article...')
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Edit Article: Delete error:', errorData)
        toast.error(errorData.error || 'Gagal menghapus artikel')
        return
      }

      console.log('✅ Edit Article: Deleted successfully')
      toast.success('Artikel berhasil dihapus!')
      router.push('/dashboard/cms')
    } catch (error) {
      console.error('❌ Edit Article: Delete network error:', error)
      toast.error('Terjadi kesalahan saat menghapus artikel')
    } finally {
      setDeleting(false)
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/cms"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Kembali ke CMS</span>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Edit Artikel</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {formData.status === 'published' && (
            <Button 
              asChild
              variant="outline"
              size="sm"
            >
              <Link 
                href={`/content/articles/${formData.slug}`}
                target="_blank"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Lihat
              </Link>
            </Button>
          )}
          
          <Button 
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Hapus
          </Button>
          
          <Button 
            form="edit-article-form"
            disabled={saving || !formData.title.trim()}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Konten Artikel</CardTitle>
              <CardDescription>
                Edit konten artikel edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="edit-article-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Judul Artikel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-2"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL: /content/articles/{formData.slug || 'slug-artikel'}
                  </p>
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content">Konten *</Label>
                  <div className="mt-2">
                    <RichTextEditor
                      value={formData.content}
                      onChange={(content: string) => setFormData(prev => ({ ...prev, content }))}
                      placeholder="Tulis konten artikel di sini..."
                    />
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <Label htmlFor="excerpt">Ringkasan</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Ringkasan singkat artikel untuk preview..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Featured Image */}
                <div>
                  <Label htmlFor="featuredImage">URL Gambar Utama</Label>
                  <Input
                    id="featuredImage"
                    value={formData.featuredImageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, featuredImageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="mt-2"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Publikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Tambah tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" size="sm" onClick={addTag}>
                  +
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}