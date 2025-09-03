'use client'

import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  label?: string
  error?: string
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Tulis konten artikel...",
  rows = 12,
  label = "Konten",
  error 
}: RichTextEditorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="content">{label}</Label>
      <Textarea
        id="content"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`min-h-96 font-mono text-sm ${error ? 'border-red-500' : ''}`}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div className="text-sm text-gray-500">
        <p>Tips menulis konten berkualitas:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Gunakan bahasa yang mudah dipahami pasien</li>
          <li>Sertakan informasi yang akurat dan dapat dipercaya</li>
          <li>Fokus pada aspek praktis dan aplikatif</li>
          <li>Berikan harapan dan motivasi positif</li>
        </ul>
      </div>
    </div>
  )
}