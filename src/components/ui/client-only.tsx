'use client'

import { useClientOnly } from '@/hooks/useClientOnly'
import { ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wrapper component that only renders children on the client-side
 * Prevents hydration mismatches for dynamic/interactive content
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isClient = useClientOnly()
  
  if (!isClient) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}