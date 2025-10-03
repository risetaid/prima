'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Video, Link, MessageCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger';

interface UnifiedContent {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: "article" | "video";
  thumbnailUrl: string | null;
  featuredImageUrl: string | null;
  authorName: string;
}

interface ContentItem {
  id: string
  title: string
  slug: string
  category: string
  url: string
  type: 'article' | 'video'
  excerpt?: string
  description?: string
}

interface EnhancedTemplate {
  id: string
  name: string
  category: string
  template: string
  variables: string[]
  description: string
}

interface ContentSelectorProps {
  patientName?: string
  onMessageGenerated?: (message: string, contentUrl?: string) => void
}

export default function ContentSelector({
  patientName = '',
  onMessageGenerated
}: ContentSelectorProps) {
  const [templates, setTemplates] = useState<EnhancedTemplate[]>([])
  const [articles, setArticles] = useState<ContentItem[]>([])
  const [videos, setVideos] = useState<ContentItem[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedContent, setSelectedContent] = useState('')
  const [selectedContentType, setSelectedContentType] = useState<'article' | 'video' | ''>('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEnhancedTemplates()
  }, [])

  const fetchEnhancedTemplates = async () => {
    try {
      const response = await fetch('/api/cms/content?enhanced=true&type=all&status=published&limit=100')
      const data = await response.json()

      if (data.success) {
        // Extract enhanced templates from the existing template logic
        const enhancedTemplates = [
          {
            id: "motivation_with_video",
            name: "Motivasi dengan Video",
            category: "motivational",
            template: "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
            variables: ["{nama}", "{video_url}"],
            description: "Pesan motivasi dengan link video"
          },
          {
            id: "nutrition_reminder",
            name: "Pengingat Nutrisi",
            category: "nutrition",
            template: "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
            variables: ["{nama}", "{artikel_url}"],
            description: "Pengingat makan bergizi dengan artikel nutrisi"
          },
          {
            id: "exercise_motivation",
            name: "Motivasi Olahraga",
            category: "exercise",
            template: "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
            variables: ["{nama}", "{video_url}"],
            description: "Motivasi olahraga dengan video demonstrasi"
          },
          {
            id: "general_reminder",
            name: "Pengingat Umum",
            category: "general",
            template: "Halo {nama}! ⏰\n\nIni adalah pengingat untuk Anda. {customMessage}\n\nJangan lupa dilakukan ya! 💙 Tim PRIMA",
            variables: ["{nama}", "{customMessage}"],
            description: "Pengingat umum yang dapat dikustomisasi"
          },
          {
            id: "wellness_check",
            name: "Cek Kesehatan",
            category: "medical",
            template: "Halo {nama}! 💙\n\nBagaimana kabar Anda hari ini? {customMessage}\n\nKami siap membantu jika ada yang dibutuhkan. 🙏 Tim PRIMA",
            variables: ["{nama}", "{customMessage}"],
            description: "Cek kondisi kesehatan pasien"
          },
        ]

        // Transform content data to match expected format
        const availableArticles = data.data
          .filter((item: UnifiedContent) => item.type === 'article')
          .map((item: UnifiedContent) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            category: item.category.toLowerCase(),
            url: `${window.location.origin}/content/articles/${item.slug}`,
            type: 'article' as const,
            excerpt: (item as UnifiedContent & { excerpt?: string }).excerpt || ''
          }))

        const availableVideos = data.data
          .filter((item: UnifiedContent) => item.type === 'video')
          .map((item: UnifiedContent) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            category: item.category.toLowerCase(),
            url: `${window.location.origin}/content/videos/${item.slug}`,
            type: 'video' as const,
            description: (item as UnifiedContent & { description?: string }).description || ''
          }))

        setTemplates(enhancedTemplates)
        setArticles(availableArticles)
        setVideos(availableVideos)
      } else {
        toast.error('Gagal memuat template')
      }
    } catch (error: unknown) {
      logger.error('Error fetching templates:', error instanceof Error ? error : new Error(String(error)))
      toast.error('Terjadi kesalahan saat memuat template')
    } finally {
      setLoading(false)
    }
  }

  const generateMessage = async () => {
    if (!selectedTemplate) {
      toast.error('Pilih template terlebih dahulu')
      return
    }

    try {
      const response = await fetch('/api/cms/content?action=template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          contentId: selectedContent,
          contentType: selectedContentType,
          patientData: {
            nama: patientName
          }
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedMessage(data.data.message)
        if (onMessageGenerated) {
          onMessageGenerated(data.data.message, data.data.contentUrl)
        }
        toast.success('Pesan berhasil digenerate!')
      } else {
        toast.error('Gagal membuat pesan')
      }
    } catch (error: unknown) {
      logger.error('Error generating message:', error instanceof Error ? error : new Error(String(error)))
      toast.error('Terjadi kesalahan saat membuat pesan')
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage)
      toast.success('Pesan disalin ke clipboard!')
    } catch (error: unknown) {
      logger.error('Failed to copy:', error instanceof Error ? error : new Error(String(error)))
      toast.error('Gagal menyalin pesan')
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      nutrisi: 'bg-green-100 text-green-800',
      olahraga: 'bg-purple-100 text-purple-800',
      motivational: 'bg-orange-100 text-orange-800',
      medical: 'bg-red-100 text-red-800',
      faq: 'bg-indigo-100 text-indigo-800',
      testimoni: 'bg-pink-100 text-pink-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Template Pesan Enhanced
          </CardTitle>
          <CardDescription>
            Pilih template pesan yang sudah terintegrasi dengan konten edukasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Template Pesan</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium text-gray-700">Preview Template:</Label>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                {templates.find(t => t.id === selectedTemplate)?.template}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Selection */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Pilih Konten
            </CardTitle>
            <CardDescription>
              Pilih artikel atau video yang akan disertakan dalam pesan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Jenis Konten</Label>
              <Select value={selectedContentType} onValueChange={(value) => {
                setSelectedContentType(value as 'article' | 'video')
                setSelectedContent('')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis konten..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Artikel</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedContentType && (
              <div>
                <Label>{selectedContentType === 'article' ? 'Pilih Artikel' : 'Pilih Video'}</Label>
                <Select value={selectedContent} onValueChange={setSelectedContent}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Pilih ${selectedContentType === 'article' ? 'artikel' : 'video'}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedContentType === 'article' ? articles : videos).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          {item.type === 'article' ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Video className="h-4 w-4" />
                          )}
                          <span>{item.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedContent && (
              <div className="p-4 bg-blue-50 rounded-lg">
                {(() => {
                  const item = (selectedContentType === 'article' ? articles : videos)
                    .find(i => i.id === selectedContent)

                  return item ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                        <h4 className="font-medium">{item.title}</h4>
                      </div>
                      {(item.excerpt || item.description) && (
                        <p className="text-sm text-gray-600">
                          {item.excerpt || item.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        URL: {item.url}
                      </p>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patient Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data Pasien</CardTitle>
          <CardDescription>
            Data yang akan digunakan untuk mengganti variabel dalam template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="patientName">Nama Pasien</Label>
            <Input
              id="patientName"
              value={patientName}
              readOnly
              className="bg-gray-50"
            />
          </div>

        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateMessage}
          disabled={!selectedTemplate}
          size="lg"
        >
          Generate Pesan Enhanced
        </Button>
      </div>

      {/* Generated Message */}
      {generatedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pesan yang Digenerate</span>
              <Button variant="outline" size="sm" onClick={copyMessage}>
                <Copy className="h-4 w-4 mr-2" />
                Salin
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg border">
              <p className="whitespace-pre-wrap text-gray-900">
                {generatedMessage}
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Pesan siap untuk dikirim via WhatsApp dengan konten edukasi terintegrasi!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

