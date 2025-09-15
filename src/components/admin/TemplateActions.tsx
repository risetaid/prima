'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Database } from 'lucide-react'

interface TemplateActionsProps {
  filterCategory: string
  setFilterCategory: (value: string) => void
  templatesLength: number
  onSeedTemplates?: () => Promise<void>
  seeding?: boolean
  onCreate: () => void
}

export function TemplateActions({ filterCategory, setFilterCategory, templatesLength, onSeedTemplates, seeding, onCreate }: TemplateActionsProps) {
  return (
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
          {templatesLength} template
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

        <Button className="cursor-pointer w-full sm:w-auto" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Template
        </Button>
      </div>
    </div>
  )
}