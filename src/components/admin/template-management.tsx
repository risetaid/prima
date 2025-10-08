'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { TemplateActions } from '@/components/admin/TemplateActions'
import { TemplateList } from '@/components/admin/TemplateList'
import { TemplateForm } from '@/components/admin/TemplateForm'
import { TemplatePreviewModal } from '@/components/admin/TemplatePreviewModal'
import { WhatsAppTemplate, TemplateFormData } from '@/components/admin/types'



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
      const result = await response.json()
      const data = result.data || result

      // Debug: Log the API response structure
      logger.info('🔍 Templates API Response:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof data,
        hasTemplates: !!data.templates,
        templatesLength: data.templates?.length,
        filterCategory
      })

      if (data.templates) {
        setTemplates(data.templates)
        logger.info(`✅ Loaded ${data.templates.length} templates`)
      } else {
        logger.error('❌ No templates array found in response', new Error('No templates array found'), {
          responseData: data,
          apiResponse: result
        })
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

      const result = await response.json()
      const data = result.data || result // Unwrap createApiHandler response

      logger.info('Template creation response:', { success: result.success, hasData: !!result.data, template: data.template })

      if (response.ok) {
        toast.success('Template berhasil dibuat')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error || result.error || 'Failed to create template')
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

      const result = await response.json()
      const data = result.data || result // Unwrap createApiHandler response

      logger.info('Template update response:', { success: result.success, hasData: !!result.data, template: data.template })

      if (response.ok) {
        toast.success('Template berhasil diperbarui')
        setIsEditDialogOpen(false)
        setSelectedTemplate(null)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error || result.error || 'Failed to update template')
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

      const result = await response.json()
      const data = result.data || result // Unwrap createApiHandler response

      logger.info('Template delete response:', { success: result.success, hasData: !!result.data, message: data.message })

      if (response.ok) {
        toast.success('Template berhasil dinonaktifkan')
        fetchTemplates()
      } else {
        toast.error(data.error || result.error || 'Failed to deactivate template')
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
      <TemplateActions
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        templatesLength={templates.length}
        onSeedTemplates={onSeedTemplates}
        seeding={seeding}
        onCreate={() => setIsCreateDialogOpen(true)}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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

      <TemplateList
        templates={templates}
        onPreview={openPreviewDialog}
        onEdit={openEditDialog}
        onDeactivate={handleDeactivateTemplate}
        onCreate={() => setIsCreateDialogOpen(true)}
        actionLoading={actionLoading}
      />

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

      <TemplatePreviewModal
        isOpen={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        template={previewTemplate}
      />

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



