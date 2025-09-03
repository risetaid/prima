'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Video, Save, Eye, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const categories = [
  { value: 'general', label: 'Umum', color: 'bg-blue-100 text-blue-800' },
  { value: 'nutrisi', label: 'Nutrisi', color: 'bg-green-100 text-green-800' },
  { value: 'olahraga', label: 'Olahraga', color: 'bg-purple-100 text-purple-800' },
  { value: 'motivational', label: 'Motivasi', color: 'bg-orange-100 text-orange-800' },
  { value: 'medical', label: 'Medis', color: 'bg-red-100 text-red-800' },
  { value: 'faq', label: 'FAQ', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'testimoni', label: 'Testimoni', color: 'bg-pink-100 text-pink-800' }
]

interface VideoEditPageProps {
  params: Promise<{ id: string }>
}

export default function VideoEditPage({ params }: VideoEditPageProps) {
  const router = useRouter()
  const [videoId, setVideoId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationMinutes: '',
    category: 'general',
    tags: [] as string[],
    seoTitle: '',
    seoDescription: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const resolvedParams = await params
        setVideoId(resolvedParams.id)
        
        console.log('🔍 Edit Video: Loading video', resolvedParams.id)
        const response = await fetch(`/api/cms/videos/${resolvedParams.id}`)
        
        if (!response.ok) {
          console.error('❌ Edit Video: API error:', response.status)
          if (response.status === 404) {
            toast.error('Video tidak ditemukan')
          } else if (response.status === 401) {
            toast.error('Tidak memiliki akses')
          } else {
            toast.error('Gagal memuat video')
          }
          router.push('/dashboard/cms')
          return
        }

        const data = await response.json()
        console.log('✅ Edit Video: Loaded', data.data)
        
        if (data.success) {
          const video = data.data
          setFormData({
            title: video.title || '',
            slug: video.slug || '',
            description: video.description || '',
            videoUrl: video.videoUrl || '',
            thumbnailUrl: video.thumbnailUrl || '',
            durationMinutes: video.durationMinutes || '',
            category: video.category || 'general',
            tags: video.tags || [],
            seoTitle: video.seoTitle || '',
            seoDescription: video.seoDescription || '',
            status: video.status || 'draft'
          })
        }
      } catch (error) {
        console.error('❌ Edit Video: Network error:', error)
        toast.error('Terjadi kesalahan saat memuat video')
        router.push('/dashboard/cms')
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
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
      toast.error('Judul video wajib diisi')
      return
    }

    if (!formData.videoUrl.trim()) {
      toast.error('URL video wajib diisi')
      return
    }

    setSaving(true)

    try {
      console.log('💾 Edit Video: Saving changes...')
      const response = await fetch(`/api/cms/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          seoTitle: formData.seoTitle || formData.title,
          seoDescription: formData.seoDescription || formData.description?.substring(0, 160)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Edit Video: API error:', errorData)
        toast.error(errorData.error || 'Gagal menyimpan video')
        return
      }

      const data = await response.json()
      console.log('✅ Edit Video: Saved successfully')
      
      toast.success('Video berhasil diperbarui!')
      router.push('/dashboard/cms')
    } catch (error) {
      console.error('❌ Edit Video: Network error:', error)
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus video ini? Tindakan ini tidak dapat dibatalkan.')) {
      return
    }

    setDeleting(true)

    try {
      console.log('🗑️ Edit Video: Deleting video...')
      const response = await fetch(`/api/cms/videos/${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Edit Video: Delete error:', errorData)
        toast.error(errorData.error || 'Gagal menghapus video')
        return
      }

      console.log('✅ Edit Video: Deleted successfully')
      toast.success('Video berhasil dihapus!')
      router.push('/dashboard/cms')
    } catch (error) {
      console.error('❌ Edit Video: Delete network error:', error)
      toast.error('Terjadi kesalahan saat menghapus video')
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/cms"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Kembali ke CMS</span>
          </Link>
          <div className="hidden sm:block h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Edit Video</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {formData.status === 'published' && (
            <Button 
              asChild
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Link 
                href={`/content/videos/${formData.slug}`}
                target="_blank"
                className="flex items-center justify-center gap-2"
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
            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
          >
            {deleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Hapus
          </Button>
          
          <Button 
            form="edit-video-form"
            disabled={saving || !formData.title.trim()}
            className="flex-1 sm:flex-none"
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
              <CardTitle>Informasi Video</CardTitle>
              <CardDescription>
                Edit detail video edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="edit-video-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Judul Video *</Label>
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
                    URL: /content/videos/{formData.slug || 'slug-video'}
                  </p>
                </div>

                {/* Video URL */}
                <div>
                  <Label htmlFor="videoUrl">URL Video *</Label>
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                    className="mt-2"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Dukung YouTube dan Vimeo. Thumbnail akan otomatis diambil.
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <Label htmlFor="duration">Durasi</Label>
                  <Input
                    id="duration"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                    placeholder="8 menit"
                    className="mt-2"
                  />
                </div>

                {/* Thumbnail URL */}
                <div>
                  <Label htmlFor="thumbnailUrl">URL Thumbnail (Opsional)</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    placeholder="https://img.youtube.com/..."
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Kosongkan untuk otomatis menggunakan thumbnail dari video
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi video yang akan ditampilkan untuk pasien..."
                    rows={6}
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
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1"
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
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {formData.tags.length === 0 && (
                <p className="text-sm text-gray-500">Belum ada tag</p>
              )}
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
                  placeholder="Otomatis dari judul"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.seoTitle.length}/60 karakter
                </p>
              </div>

              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="Otomatis dari deskripsi"
                  rows={3}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.seoDescription.length}/160 karakter
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}