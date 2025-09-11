'use client'

import { toast as sonnerToast } from 'sonner'

// Modern toast utilities using Sonner
export const toast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  
  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  
  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
  
  warning: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    })
  },
}

