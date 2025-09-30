'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye, MessageSquare } from 'lucide-react'
import { WhatsAppTemplate, categoryIcons, categoryLabels, categoryColors } from '@/components/admin/types'

interface TemplateListProps {
  templates: WhatsAppTemplate[]
  onPreview: (template: WhatsAppTemplate) => void
  onEdit: (template: WhatsAppTemplate) => void
  onDeactivate: (id: string) => void
  onCreate: () => void
  actionLoading: string | null
}

export function TemplateList({ templates, onPreview, onEdit, onDeactivate, onCreate, actionLoading }: TemplateListProps) {
  return (
    <>
      {templates.length === 0 ? (
        <EmptyTemplates onCreate={onCreate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={onPreview}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              loading={actionLoading === template.id}
            />
          ))}
        </div>
      )}
    </>
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