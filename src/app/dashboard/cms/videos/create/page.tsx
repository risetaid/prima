'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Video, Save, Eye, X } from 'lucide-react'
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

export default function CreateVideoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    status: 'draft' as 'draft' | 'published'
  })
  const [newTag, setNewTag] = useState('')

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }))
  }

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

    setLoading(true)

    try {
      const response = await fetch('/api/cms/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          seoTitle: formData.seoTitle || formData.title,
          seoDescription: formData.seoDescription || formData.description.substring(0, 160)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Create Video: API error:', errorData)
        
        if (response.status === 401) {
          toast.error('Tidak memiliki akses untuk membuat video')
        } else if (response.status === 400 && errorData.error?.includes('Slug already exists')) {
          toast.error('URL sudah digunakan. Ganti judul atau slug.')
        } else {
          toast.error(errorData.error || 'Gagal membuat video')
        }
        return
      }

      const data = await response.json()
      console.log('✅ Create Video: Success:', data)
      
      toast.success('Video berhasil dibuat!')
      router.push('/dashboard/cms')
    } catch (error) {
      console.error('❌ Create Video: Network error:', error)
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
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
            <Video className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Video Baru</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/cms')}
            disabled={loading}
          >
            Batal
          </Button>
          <Button 
            form="create-video-form"
            disabled={loading || !formData.title.trim()}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {formData.status === 'published' ? 'Publikasikan' : 'Simpan Draft'}
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
                Masukkan detail video edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="create-video-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Judul Video *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Contoh: Latihan Pernapasan untuk Pasien Kanker"
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
                    placeholder="latihan-pernapasan-pasien-kanker"
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
                    placeholder="https://www.youtube.com/watch?v=..."
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
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
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
                  placeholder="Otomatis dari judul"
                  className="mt-2"
                />
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}