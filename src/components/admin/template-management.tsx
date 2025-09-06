'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, MessageSquare, Calendar, BookOpen, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppTemplate {
  id: string
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUser: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

interface TemplateFormData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

const categoryIcons = {
  REMINDER: MessageSquare,
  APPOINTMENT: Calendar,
  EDUCATIONAL: BookOpen
}

const categoryLabels = {
  REMINDER: 'Pengingat',
  APPOINTMENT: 'Janji Temu',
  EDUCATIONAL: 'Edukasi'
}

const categoryColors = {
  REMINDER: 'bg-blue-100 text-blue-800 border-blue-200',
  APPOINTMENT: 'bg-green-100 text-green-800 border-green-200',
  EDUCATIONAL: 'bg-purple-100 text-purple-800 border-purple-200'
}

const commonVariables = [
  '{nama}', '{obat}', '{dosis}', '{waktu}', '{tanggal}', 
  '{dokter}', '{rumahSakit}', '{volunteer}'
]

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  
  const [formData, setFormData] = useState<TemplateFormData>({
    templateName: '',
    templateText: '',
    variables: [],
    category: 'REMINDER'
  })

  useEffect(() => {
    fetchTemplates()
  }, [filterCategory, fetchTemplates])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterCategory !== 'all') {
        params.append('category', filterCategory)
      }
      
      const response = await fetch(`/api/admin/templates?${params}`)
      const data = await response.json()
      
      if (data.templates) {
        setTemplates(data.templates)
      } else {
        toast.error('Failed to fetch templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      templateName: '',
      templateText: '',
      variables: [],
      category: 'REMINDER'
    })
  }

  const extractVariables = (text: string) => {
    const matches = text.match(/{[^}]+}/g)
    return matches ? [...new Set(matches)] : []
  }

  const handleTextChange = (text: string) => {
    setFormData(prev => ({
      ...prev,
      templateText: text,
      variables: extractVariables(text)
    }))
  }

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="templateText"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentText = formData.templateText
      const newText = currentText.substring(0, start) + variable + currentText.substring(end)
      handleTextChange(newText)
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length
        textarea.focus()
      }, 0)
    }
  }

  const handleCreateTemplate = async () => {
    if (!formData.templateName.trim() || !formData.templateText.trim()) {
      toast.error('Nama template dan teks wajib diisi')
      return
    }

    try {
      setActionLoading('create')
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Template berhasil dibuat')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditTemplate = async () => {
    if (!selectedTemplate || !formData.templateName.trim() || !formData.templateText.trim()) {
      toast.error('Nama template dan teks wajib diisi')
      return
    }

    try {
      setActionLoading('edit')
      const response = await fetch(`/api/admin/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Template berhasil diperbarui')
        setIsEditDialogOpen(false)
        setSelectedTemplate(null)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Failed to update template')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivateTemplate = async (templateId: string) => {
    if (!confirm('Yakin ingin menonaktifkan template ini?')) return

    try {
      setActionLoading(templateId)
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Template berhasil dinonaktifkan')
        fetchTemplates()
      } else {
        toast.error(data.error || 'Failed to deactivate template')
      }
    } catch (error) {
      console.error('Error deactivating template:', error)
      toast.error('Failed to deactivate template')
    } finally {
      setActionLoading(null)
    }
  }

  const openEditDialog = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      templateName: template.templateName,
      templateText: template.templateText,
      variables: template.variables,
      category: template.category
    })
    setIsEditDialogOpen(true)
  }

  const openPreviewDialog = (template: WhatsAppTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewDialogOpen(true)
  }

  const renderPreviewText = (text: string, variables: string[]) => {
    const sampleData: Record<string, string> = {
      '{nama}': 'Ibu Sari',
      '{obat}': 'Paracetamol',
      '{dosis}': '500mg',
      '{waktu}': '08:00',
      '{tanggal}': '15 Januari 2024',
      '{dokter}': 'Dr. Ahmad',
      '{rumahSakit}': 'RS Harapan',
      '{volunteer}': 'Sari (volunteer)'
    }

    let previewText = text
    variables.forEach(variable => {
      if (sampleData[variable]) {
        previewText = previewText.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), sampleData[variable])
      }
    })

    return previewText
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="REMINDER">Pengingat</SelectItem>
              <SelectItem value="APPOINTMENT">Janji Temu</SelectItem>
              <SelectItem value="EDUCATIONAL">Edukasi</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-gray-600">
            {templates.length} template
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Buat Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buat Template Baru</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              onTextChange={handleTextChange}
              onInsertVariable={insertVariable}
              onSubmit={handleCreateTemplate}
              onCancel={() => {
                resetForm()
                setIsCreateDialogOpen(false)
              }}
              loading={actionLoading === 'create'}
              submitLabel="Buat Template"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada template
            </h3>
            <p className="text-gray-600 mb-6">
              Buat template pertama untuk mempermudah pengiriman pesan WhatsApp
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Buat Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {templates.map((template) => {
            const CategoryIcon = categoryIcons[template.category]
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                            {template.templateName}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${categoryColors[template.category]} border text-xs`}>
                            {categoryLabels[template.category]}
                          </Badge>
                          {!template.isActive && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                              Nonaktif
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4">
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                          {template.templateText.length > (window.innerWidth < 640 ? 150 : 200)
                            ? template.templateText.substring(0, window.innerWidth < 640 ? 150 : 200) + '...' 
                            : template.templateText
                          }
                        </p>
                      </div>

                      {template.variables.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Variabel tersedia:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 gap-1 sm:gap-0">
                        <span>
                          Dibuat oleh {template.createdByUser.firstName} {template.createdByUser.lastName}
                        </span>
                        <span className="hidden sm:inline mx-2">•</span>
                        <span>
                          {new Date(template.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: window.innerWidth < 640 ? 'short' : 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center lg:justify-start gap-2 lg:ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreviewDialog(template)}
                        className="cursor-pointer flex-1 lg:flex-none"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="ml-1 sm:hidden">Lihat</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                        disabled={actionLoading === template.id}
                        className="cursor-pointer flex-1 lg:flex-none"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="ml-1 sm:hidden">Edit</span>
                      </Button>
                      
                      {template.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateTemplate(template.id)}
                          disabled={actionLoading === template.id}
                          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 lg:flex-none"
                        >
                          {actionLoading === template.id ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="ml-1 sm:hidden">Hapus</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <TemplateForm
            formData={formData}
            setFormData={setFormData}
            onTextChange={handleTextChange}
            onInsertVariable={insertVariable}
            onSubmit={handleEditTemplate}
            onCancel={() => {
              resetForm()
              setIsEditDialogOpen(false)
            }}
            loading={actionLoading === 'edit'}
            submitLabel="Perbarui Template"
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Template</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nama Template</Label>
                <p className="text-sm text-gray-700">{previewTemplate.templateName}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Kategori</Label>
                <Badge className={`${categoryColors[previewTemplate.category]} border ml-2`}>
                  {categoryLabels[previewTemplate.category]}
                </Badge>
              </div>

              <div>
                <Label className="text-sm font-medium">Template Asli</Label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {previewTemplate.templateText}
                  </p>
                </div>
              </div>

              {previewTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Preview dengan Data Contoh</Label>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 whitespace-pre-wrap">
                      {renderPreviewText(previewTemplate.templateText, previewTemplate.variables)}
                    </p>
                  </div>
                </div>
              )}

              {previewTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Variabel Tersedia</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Template Form Component
function TemplateForm({
  formData,
  setFormData,
  onTextChange,
  onInsertVariable,
  onSubmit,
  onCancel,
  loading,
  submitLabel
}: {
  formData: TemplateFormData
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>
  onTextChange: (text: string) => void
  onInsertVariable: (variable: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="templateName">Nama Template *</Label>
        <Input
          id="templateName"
          value={formData.templateName}
          onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
          placeholder="Contoh: Pengingat Minum Obat Pagi"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="category">Kategori *</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value: string) => setFormData(prev => ({ ...prev, category: value as TemplateFormData['category'] }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REMINDER">Pengingat</SelectItem>
            <SelectItem value="APPOINTMENT">Janji Temu</SelectItem>
            <SelectItem value="EDUCATIONAL">Edukasi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="templateText">Teks Template *</Label>
        <Textarea
          id="templateText"
          name="templateText"
          value={formData.templateText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onTextChange(e.target.value)}
          placeholder="Halo {nama}, jangan lupa minum obat {obat} dengan dosis {dosis} pada pukul {waktu}. Terima kasih!"
          className="mt-1 min-h-[120px]"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Variabel Tersedia (Klik untuk menambah)</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {commonVariables.map((variable) => (
            <Button
              key={variable}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInsertVariable(variable)}
              className="cursor-pointer text-xs"
            >
              {variable}
            </Button>
          ))}
        </div>
      </div>

      {formData.variables.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Variabel yang Terdeteksi</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.variables.map((variable) => (
              <Badge key={variable} variant="secondary">
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={loading} onClick={onCancel} className="cursor-pointer">
          Batal
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={loading || !formData.templateName.trim() || !formData.templateText.trim()}
          className="cursor-pointer"
        >
          {loading && <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}