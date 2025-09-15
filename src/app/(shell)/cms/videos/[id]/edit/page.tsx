'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Save, Eye, Trash2, Download } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { generateRandomSlug } from '@/lib/slug-utils'
import { extractYouTubeVideoId, fetchYouTubeVideoData } from '@/lib/youtube-utils'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { logger } from '@/lib/logger'

const categories = [
  { value: 'general', label: 'Umum' },
  { value: 'nutrisi', label: 'Nutrisi' },
  { value: 'olahraga', label: 'Olahraga' },
  { value: 'motivational', label: 'Motivasi' },
  { value: 'medical', label: 'Medis' },
  { value: 'faq', label: 'FAQ' },
  { value: 'testimoni', label: 'Testimoni' }
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
  const [fetchingVideoData, setFetchingVideoData] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [thumbnailSrc, setThumbnailSrc] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationMinutes: '',
    category: 'general',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const resolvedParams = await params
        setVideoId(resolvedParams.id)
        
        logger.info('🔍 Edit Video: Loading video', { videoId: resolvedParams.id })
        const response = await fetch(`/api/cms/videos/${resolvedParams.id}`)

        if (!response.ok) {
          logger.error('❌ Edit Video: API error', undefined, { status: response.status })
          if (response.status === 404) {
            toast.error('Video tidak ditemukan')
          } else if (response.status === 401) {
            toast.error('Tidak memiliki akses')
          } else {
            toast.error('Gagal memuat video')
          }
          router.push('/cms')
          return
        }

        const data = await response.json()
        logger.info('✅ Edit Video: Loaded', { data: data.data })
        
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
            status: video.status || 'draft'
          })
        }
      } catch (error) {
        logger.error('❌ Edit Video: Network error', error as Error)
        toast.error('Terjadi kesalahan saat memuat video')
        router.push('/cms')
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
  }, [params, router])

  useEffect(() => {
    setThumbnailSrc(formData.thumbnailUrl || '/placeholder-video.jpg')
  }, [formData.thumbnailUrl])

  const generateNewSlug = () => {
    return generateRandomSlug()
  }

  const fetchVideoDataFromUrl = async () => {
    if (!formData.videoUrl.trim()) {
      toast.error('URL video tidak boleh kosong')
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
      
      toast.success('Data video berhasil diperbarui!')
    } catch (error) {
      logger.error('Error fetching video data', error as Error)
      toast.error('Gagal mengambil data video. Pastikan URL valid.')
    } finally {
      setFetchingVideoData(false)
    }
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
      logger.info('💾 Edit Video: Saving changes...')
      const response = await fetch(`/api/cms/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('❌ Edit Video: API error', undefined, { errorData })
        toast.error(errorData.error || 'Gagal menyimpan video')
        return
      }

      logger.info('✅ Edit Video: Saved successfully')

      toast.success('Video berhasil diperbarui!')
      router.push('/cms')
    } catch (error) {
      logger.error('❌ Edit Video: Network error', error as Error)
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)

    try {
      logger.info('🗑️ Edit Video: Deleting video...')
      const response = await fetch(`/api/cms/videos/${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('❌ Edit Video: Delete error', undefined, { errorData })
        toast.error(errorData.error || 'Gagal menghapus video')
        return
      }

      logger.info('✅ Edit Video: Video deleted successfully')
      toast.success('Video berhasil dihapus')
      router.push('/cms')
    } catch (error) {
      logger.error('❌ Edit Video: Unexpected error', error as Error)
      toast.error('Terjadi kesalahan saat menghapus video')
    } finally {
      setDeleting(false)
      setIsDeleteModalOpen(false)
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
      {/* Action Buttons Card */}
      <Card>
        <CardContent className="py-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton text="Kembali ke CMS" />
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Video</CardTitle>
              <CardDescription>
                Edit URL YouTube untuk auto-fetch data video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form id="edit-video-form" onSubmit={handleSubmit}>
                {/* Video URL with Auto-fetch */}
                <div>
                  <Label htmlFor="videoUrl">URL YouTube *</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="videoUrl"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
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
                  <p className="text-sm text-gray-500 mt-1">
                    Klik &quot;Auto-fetch&quot; untuk mengambil data video terbaru
                  </p>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Judul Video *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                     placeholder="Contoh: Latihan Pernapasan untuk Pasien Kanker"
                    className="mt-2"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="YouTube-style random slug"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                    placeholder="Auto-filled dari YouTube (atau isi manual)"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Akan diperbarui saat auto-fetch (jika tersedia)
                  </p>
                </div>

                {/* Description - Auto-filled */}
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Auto-filled dari deskripsi YouTube (atau isi manual)"
                    rows={6}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Akan diperbarui saat auto-fetch dari deskripsi YouTube
                  </p>
                </div>

                {/* Thumbnail URL - Auto-filled */}
                <div>
                  <Label htmlFor="thumbnailUrl">URL Thumbnail</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    placeholder="Auto-filled dari YouTube thumbnail"
                    className="mt-2"
                    readOnly
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Thumbnail otomatis diambil dari YouTube dengan kualitas maksimal
                  </p>
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
                <Select value={formData.status} onValueChange={(value: 'draft' | 'published' | 'archived') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="mt-2">
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
                <Image
                  src={thumbnailSrc}
                  alt="Video thumbnail"
                  width={320}
                  height={180}
                  className="w-full rounded-lg"
                  onError={() => setThumbnailSrc('/placeholder-video.jpg')}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Video"
        description="Yakin ingin menghapus video ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}
