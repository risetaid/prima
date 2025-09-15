import { MessageSquare, Calendar, BookOpen } from 'lucide-react'

export interface WhatsAppTemplate {
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

export interface TemplateFormData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

export const categoryIcons = {
  REMINDER: MessageSquare,
  APPOINTMENT: Calendar,
  EDUCATIONAL: BookOpen
}

export const categoryLabels = {
  REMINDER: 'Pengingat',
  APPOINTMENT: 'Janji Temu',
  EDUCATIONAL: 'Edukasi'
}

export const categoryColors = {
  REMINDER: 'bg-blue-100 text-blue-800 border-blue-200',
  APPOINTMENT: 'bg-green-100 text-green-800 border-green-200',
  EDUCATIONAL: 'bg-purple-100 text-purple-800 border-purple-200'
}

export const commonVariables = [
  '{nama}', '{obat}', '{dosis}', '{waktu}', '{tanggal}',
  '{dokter}', '{rumahSakit}', '{volunteer}', '{nomor}'
]