'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import RichTextEditor from '@/components/cms/RichTextEditor'
import { ArrowLeft, Save, Eye, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CMSBreadcrumb } from '@/components/ui/breadcrumb'

interface FormData {
  title: string
  slug: string
  content: string
  excerpt: string
  featuredImageUrl: string
  category: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  status: 'draft' | 'published' | 'archived'
}

export default function CreateArticlePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [formData, setFormData] = useState<FormData>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImageUrl: '',
    category: '',
    tags: [],
    seoTitle: '',
    seoDescription: '',
    status: 'draft'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categories = [
    { value: 'general', label: 'Umum' },
    { value: 'nutrisi', label: 'Nutrisi' },
    { value: 'olahraga', label: 'Olahraga' },
    { value: 'motivational', label: 'Motivasi' },
    { value: 'medical', label: 'Medis' },
    { value: 'faq', label: 'FAQ' },
    { value: 'testimoni', label: 'Testimoni' }
  ]

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from title
      ...(field === 'title' && !prev.slug ? { slug: generateSlug(value) } : {}),
      // Auto-generate SEO title from title
      ...(field === 'title' && !prev.seoTitle ? { seoTitle: value } : {})
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
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

    if (!formData.title.trim()) newErrors.title = 'Judul wajib diisi'
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi'
    if (!formData.content.trim()) newErrors.content = 'Konten wajib diisi'
    if (!formData.category) newErrors.category = 'Kategori wajib dipilih'
    
    if (formData.featuredImageUrl && !isValidUrl(formData.featuredImageUrl)) {
      newErrors.featuredImageUrl = 'URL gambar tidak valid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSave = async (status: 'draft' | 'published') => {
    const dataToSave = { ...formData, status }
    
    if (!validateForm()) return

    setSaving(true)
    try {
      const response = await fetch('/api/cms/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Artikel berhasil ${status === 'published' ? 'dipublikasikan' : 'disimpan sebagai draft'}`)
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
      console.error('Error saving article:', error)
      toast.error('Terjadi kesalahan saat menyimpan artikel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <CMSBreadcrumb />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/cms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Buat Artikel Baru
            </h1>
            <p className="text-gray-600 mt-1">
              Buat artikel edukasi untuk pasien kanker paliatif
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </Button>
          <Button 
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            <Eye className="h-4 w-4 mr-2" />
            Publikasikan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
              <CardDescription>
                Isi informasi dasar artikel yang akan dibuat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Judul Artikel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Masukkan judul artikel..."
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="slug">Slug URL *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="artikel-slug-url"
                  className={errors.slug ? 'border-red-500' : ''}
                />
                {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  URL artikel: /content/articles/{formData.slug || 'artikel-slug-url'}
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt">Ringkasan</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="Ringkasan singkat artikel (opsional)..."
                  rows={3}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ringkasan akan tampil dalam daftar artikel dan preview
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Konten Artikel</CardTitle>
              <CardDescription>
                Tulis konten lengkap artikel menggunakan format teks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => handleInputChange('content', value)}
                error={errors.content}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category & Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Kategori & Tag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
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

              <div>
                <Label>Tag</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tambah tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Gambar Unggulan</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="featuredImage">URL Gambar</Label>
                <Input
                  id="featuredImage"
                  type="url"
                  value={formData.featuredImageUrl}
                  onChange={(e) => handleInputChange('featuredImageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={errors.featuredImageUrl ? 'border-red-500' : ''}
                />
                {errors.featuredImageUrl && <p className="text-sm text-red-600 mt-1">{errors.featuredImageUrl}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  Opsional. Gambar akan tampil di preview artikel
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Optimasi untuk mesin pencari dan media sosial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">Judul SEO</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                  placeholder="Judul untuk mesin pencari..."
                  maxLength={60}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.seoTitle.length}/60 karakter
                </p>
              </div>

              <div>
                <Label htmlFor="seoDescription">Deskripsi SEO</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                  placeholder="Deskripsi untuk mesin pencari dan media sosial..."
                  rows={3}
                  maxLength={160}
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