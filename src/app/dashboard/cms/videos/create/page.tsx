'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Video, Save, Eye, X, Download } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { generateRandomSlug } from '@/lib/slug-utils'
import { extractYouTubeVideoId, fetchYouTubeVideoData } from '@/lib/youtube-utils'

const categories = [
  { value: 'general', label: 'Umum', color: 'bg-blue-100 text-blue-800' },
  { value: 'nutrisi', label: 'Nutrisi', color: 'bg-green-100 text-green-800' },
  { value: 'olahraga', label: 'Olahraga', color: 'bg-purple-100 text-purple-800' },
  { value: 'motivational', label: 'Motivasi', color: 'bg-orange-100 text-orange-800' },
  { value: 'medical', label: 'Medis', color: 'bg-red-100 text-red-800' },
  { value: 'faq', label: 'FAQ', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'testimoni', label: 'Testimoni', color: 'bg-pink-100 text-pink-800' }
]

interface FormData {
  title: string
  slug: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  durationMinutes: string
  category: string
  tags: string[]
  status: 'draft' | 'published'
}

export default function CreateVideoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingVideoData, setFetchingVideoData] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    slug: generateRandomSlug(), // Use YouTube-style random slug
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationMinutes: '',
    category: 'motivational',
    tags: [],
    status: 'draft'
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const generateNewSlug = () => {
    return generateRandomSlug()
  }

  const fetchVideoDataFromUrl = async () => {
    if (!formData.videoUrl.trim()) {
      toast.error('Masukkan URL video terlebih dahulu')
      return
    }

    const videoId = extractYouTubeVideoId(formData.videoUrl)
    if (!videoId) {
      toast.error('URL YouTube tidak valid')
      return
    }

    setFetchingVideoData(true)
    try {
      const videoData = await fetchYouTubeVideoData(videoId)
      
      setFormData(prev => ({
        ...prev,
        title: videoData.title || prev.title,
        description: videoData.description || prev.description,
        thumbnailUrl: videoData.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        durationMinutes: videoData.duration || prev.durationMinutes
      }))
      
      toast.success('Data video berhasil diambil!')
    } catch (error) {
      console.error('Error fetching video data:', error)
      toast.error('Gagal mengambil data video. Pastikan URL valid.')
    } finally {
      setFetchingVideoData(false)
    }
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Judul video wajib diisi'
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi'
    if (!formData.videoUrl.trim()) newErrors.videoUrl = 'URL video wajib diisi'
    if (!formData.category) newErrors.category = 'Kategori wajib dipilih'
    
    // Validate YouTube URL
    if (formData.videoUrl && !extractYouTubeVideoId(formData.videoUrl)) {
      newErrors.videoUrl = 'URL YouTube tidak valid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (status: 'draft' | 'published') => {
    const dataToSave = { ...formData, status }
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await fetch('/api/cms/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Video berhasil ${status === 'published' ? 'dipublikasikan' : 'disimpan sebagai draft'}`)
        router.push('/dashboard/cms')
      } else {
        if (result.details) {
          // Handle validation errors from API
          const apiErrors: Record<string, string> = {}
          result.details.forEach((error: any) => {
            apiErrors[error.path[0]] = error.message
          })
          setErrors(apiErrors)
        } else {
          toast.error(result.error || 'Terjadi kesalahan')
        }
      }
    } catch (error) {
      console.error('Error saving video:', error)
      toast.error('Terjadi kesalahan saat menyimpan video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton text="Kembali ke CMS" />
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
            onClick={() => handleSave('draft')}
            disabled={loading || !formData.title.trim()}
            variant="outline"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Draft
          </Button>
          <Button 
            onClick={() => handleSave('published')}
            disabled={loading || !formData.title.trim()}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Publikasikan
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
                Masukkan URL YouTube untuk auto-fetch data video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video URL with Auto-fetch */}
              <div>
                <Label htmlFor="videoUrl">URL YouTube *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={errors.videoUrl ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    onClick={fetchVideoDataFromUrl}
                    disabled={fetchingVideoData || !formData.videoUrl.trim()}
                    variant="outline"
                  >
                    {fetchingVideoData ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Auto-fetch
                  </Button>
                </div>
                {errors.videoUrl && <p className="text-sm text-red-600 mt-1">{errors.videoUrl}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  Klik &quot;Auto-fetch&quot; untuk mengambil data video secara otomatis
                </p>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Judul Video *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Contoh: Latihan Pernapasan untuk Pasien Kanker"
                  className={`mt-2 ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="YouTube-style random slug"
                    className={errors.slug ? 'border-red-500' : ''}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, slug: generateNewSlug() }))}
                  >
                    Generate
                  </Button>
                </div>
                {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  URL: /content/videos/{formData.slug || 'random-slug'}
                </p>
              </div>

              {/* Duration - Auto-filled */}
              <div>
                <Label htmlFor="duration">Durasi</Label>
                <Input
                  id="duration"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', e.target.value)}
                  placeholder="Auto-filled dari YouTube (atau isi manual)"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Akan diisi otomatis saat auto-fetch (jika tersedia)
                </p>
              </div>

              {/* Description - Auto-filled */}
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Auto-filled dari deskripsi YouTube (atau isi manual)"
                  rows={6}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Akan diisi otomatis saat auto-fetch dari deskripsi YouTube
                </p>
              </div>

              {/* Thumbnail URL - Auto-filled */}
              <div>
                <Label htmlFor="thumbnailUrl">URL Thumbnail</Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                  placeholder="Auto-filled dari YouTube thumbnail"
                  className="mt-2"
                  readOnly
                />
                <p className="text-sm text-gray-500 mt-1">
                  Thumbnail otomatis diambil dari YouTube dengan kualitas maksimal
                </p>
              </div>
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
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className={`mt-2 ${errors.category ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  Status video akan ditentukan berdasarkan tombol yang dipilih:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Save className="h-4 w-4" />
                    <span><strong>Simpan Draft:</strong> Video disimpan sebagai draft</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Eye className="h-4 w-4" />
                    <span><strong>Publikasikan:</strong> Video langsung dipublikasikan</span>
                  </div>
                </div>
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

          {/* Video Preview */}
          {formData.thumbnailUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={formData.thumbnailUrl} 
                  alt="Video thumbnail"
                  className="w-full rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-video.jpg'
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}