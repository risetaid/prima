'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { WhatsAppTemplate, categoryLabels, categoryColors } from '@/components/admin/types'

interface TemplatePreviewModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  template: WhatsAppTemplate | null
}

export function TemplatePreviewModal({ isOpen, onOpenChange, template }: TemplatePreviewModalProps) {
  if (!template) return null

  const renderPreviewText = (text: string, variables: string[]) => {
    const sampleData: Record<string, string> = {
      '{nama}': 'Ibu Sari',
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Template</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}