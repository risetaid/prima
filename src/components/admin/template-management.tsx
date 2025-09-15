'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, MessageSquare, Calendar, BookOpen, Eye, Database } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

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
  '{dokter}', '{rumahSakit}', '{volunteer}', '{nomor}'
]

interface TemplateManagementProps {
  onSeedTemplates?: () => Promise<void>
  seeding?: boolean
}

export default function TemplateManagement({ onSeedTemplates, seeding }: TemplateManagementProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  
  const [formData, setFormData] = useState<TemplateFormData>({
    templateName: '',
    templateText: '',
    variables: [],
    category: 'REMINDER'
  })

  const fetchTemplates = useCallback(async () => {
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
      logger.error('Error fetching templates', error as Error)
      toast.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    fetchTemplates()
  }, [filterCategory, fetchTemplates])

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
      logger.error('Error creating template', error as Error)
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
      logger.error('Error updating template', error as Error)
      toast.error('Failed to update template')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivateTemplate = async (templateId: string) => {
    setTemplateToDelete(templateId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      setActionLoading(templateToDelete)
      const response = await fetch(`/api/admin/templates/${templateToDelete}`, {
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
      logger.error('Error deactivating template', error as Error)
      toast.error('Failed to deactivate template')
    } finally {
      setActionLoading(null)
      setTemplateToDelete(null)
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

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {onSeedTemplates && (
            <Button
              onClick={onSeedTemplates}
              disabled={seeding}
              variant="outline"
              className="cursor-pointer w-full sm:w-auto"
            >
              {seeding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Menambahkan Template...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Seed Template
                </>
              )}
            </Button>
          )}

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
      </div>

        {/* Templates Grid */}
         {templates.length === 0 ? (
           <EmptyTemplates onCreate={() => setIsCreateDialogOpen(true)} />
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={openPreviewDialog}
                onEdit={openEditDialog}
                onDeactivate={handleDeactivateTemplate}
                loading={actionLoading === template.id}
              />
            ))}
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
           {previewTemplate && <TemplatePreview template={previewTemplate} />}
         </DialogContent>
       </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setTemplateToDelete(null)
        }}
        onConfirm={confirmDeleteTemplate}
        title="Nonaktifkan Template"
        description="Yakin ingin menonaktifkan template ini? Template yang dinonaktifkan tidak akan bisa digunakan lagi."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="destructive"
        loading={actionLoading === templateToDelete}
      />
    </div>
  )
}

// Empty Templates Component
function EmptyTemplates({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Belum ada template
        </h3>
        <p className="text-gray-600 mb-6">
          Buat template pertama untuk mempermudah pengiriman pesan WhatsApp
        </p>
        <Button onClick={onCreate} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Buat Template
        </Button>
      </CardContent>
    </Card>
  )
}

// Template Card Component
function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDeactivate,
  loading
}: {
  template: WhatsAppTemplate
  onPreview: (template: WhatsAppTemplate) => void
  onEdit: (template: WhatsAppTemplate) => void
  onDeactivate: (id: string) => void
  loading: boolean
}) {
  const CategoryIcon = categoryIcons[template.category]

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full">
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {template.templateName}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <Badge className={`${categoryColors[template.category]} border text-xs whitespace-nowrap`}>
                  {categoryLabels[template.category]}
                </Badge>
                {!template.isActive && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs whitespace-nowrap">
                    Nonaktif
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4">
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words overflow-hidden"
                 style={{
                   display: '-webkit-box',
                   WebkitLineClamp: 4,
                   WebkitBoxOrient: 'vertical'
                 }}>
                {template.templateText}
              </p>
            </div>

            {template.variables.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Variabel tersedia:
                </p>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                  {template.variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs whitespace-nowrap">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 gap-1 sm:gap-0 mt-auto">
              <span className="truncate">
                Dibuat oleh {template.createdByUser.firstName} {template.createdByUser.lastName}
              </span>
              <span className="hidden sm:inline mx-2">•</span>
              <span className="whitespace-nowrap">
                {new Date(template.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(template)}
              className="cursor-pointer flex-1 min-w-0"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="ml-1 hidden sm:inline">Lihat</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
              disabled={loading}
              className="cursor-pointer flex-1 min-w-0"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="ml-1 hidden sm:inline">Edit</span>
            </Button>

            {template.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivate(template.id)}
                disabled={loading}
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 min-w-0"
              >
                {loading ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent flex-shrink-0" />
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="ml-1 hidden sm:inline">Hapus</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Template Preview Component
function TemplatePreview({ template }: { template: WhatsAppTemplate }) {
  const renderPreviewText = (text: string, variables: string[]) => {
    const sampleData: Record<string, string> = {
      '{nama}': 'Ibu Sari',
      '{obat}': 'Paracetamol',
      '{dosis}': '500mg',
      '{waktu}': '08:00',
      '{tanggal}': '15 Januari 2024',
      '{dokter}': 'Dr. Ahmad',
      '{rumahSakit}': 'RS Harapan',
      '{volunteer}': 'Sari (volunteer)',
      '{nomor}': '08123456789'
    }

    let previewText = text
    variables.forEach(variable => {
      if (sampleData[variable]) {
        previewText = previewText.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), sampleData[variable])
      }
    })

    return previewText
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Nama Template</Label>
        <p className="text-sm text-gray-700">{template.templateName}</p>
      </div>

      <div>
        <Label className="text-sm font-medium">Kategori</Label>
        <Badge className={`${categoryColors[template.category]} border ml-2`}>
          {categoryLabels[template.category]}
        </Badge>
      </div>

      <div>
        <Label className="text-sm font-medium">Template Asli</Label>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {template.templateText}
          </p>
        </div>
      </div>

      {template.variables.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Preview dengan Data Contoh</Label>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 whitespace-pre-wrap">
              {renderPreviewText(template.templateText, template.variables)}
            </p>
          </div>
        </div>
      )}

      {template.variables.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Variabel Tersedia</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {template.variables.map((variable) => (
              <Badge key={variable} variant="outline">
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}
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

