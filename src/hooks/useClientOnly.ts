import { useEffect, useState } from 'react'

/**
 * Custom hook to detect if component is mounted on client-side
 * Useful for preventing hydration mismatches with client-only content
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}