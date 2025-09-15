'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TemplateFormData, commonVariables } from './types'

interface TemplateFormProps {
  formData: TemplateFormData
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>
  onTextChange: (text: string) => void
  onInsertVariable: (variable: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}

export function TemplateForm({
  formData,
  setFormData,
  onTextChange,
  onInsertVariable,
  onSubmit,
  onCancel,
  loading,
  submitLabel
}: TemplateFormProps) {
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