'use client'

import { BackButton } from '@/components/ui/back-button'
import { ShareButton } from '@/components/content/ShareButton'

interface ContentHeaderProps {
  title: string
  text?: string
}

export function ContentHeader({ title, text }: ContentHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <BackButton />
          <ShareButton 
            title={title}
            text={text || 'Konten edukasi kesehatan dari PRIMA'}
          />
        </div>
      </div>
    </header>
  )
}