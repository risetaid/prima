'use client'

import { Button } from '@/components/ui/button'
import { Share } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ShareButton({ 
  title, 
  text, 
  className,
  variant = 'outline',
  size = 'sm'
}: ShareButtonProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || 'Konten edukasi kesehatan dari PRIMA',
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link telah disalin ke clipboard!')
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        alert('Gagal menyalin link. Silakan salin manual dari address bar.')
      }
    }
  }

  const getButtonText = () => {
    if (variant === 'default') {
      // For footer buttons, use more descriptive text
      if (text?.includes('Video')) {
        return 'Bagikan Video'
      } else if (text?.includes('Artikel')) {
        return 'Bagikan Artikel'  
      }
      return 'Bagikan'
    }
    return 'Bagikan'
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share className="h-4 w-4 mr-2" />
      {getButtonText()}
    </Button>
  )
}