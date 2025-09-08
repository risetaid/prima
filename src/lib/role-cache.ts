'use client'

// Role caching utility to reduce API calls and improve UX
const ROLE_CACHE_KEY = 'prima_user_role'
const ROLE_CACHE_EXPIRY = 'prima_user_role_expiry'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export interface CachedRole {
  role: string | null
  timestamp: number
}

export function getCachedRole(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cachedRole = localStorage.getItem(ROLE_CACHE_KEY)
    const expiry = localStorage.getItem(ROLE_CACHE_EXPIRY)
    
    if (!cachedRole || !expiry) return null
    
    const expiryTime = parseInt(expiry, 10)
    const now = Date.now()
    
    if (now > expiryTime) {
      // Cache expired, remove it
      clearRoleCache()
      return null
    }
    
    console.log('✅ Role Cache: Hit -', cachedRole)
    return cachedRole
  } catch (error) {
    console.error('❌ Role Cache: Error reading cache:', error)
    clearRoleCache()
    return null
  }
}

export function setCachedRole(role: string | null): void {
  if (typeof window === 'undefined') return
  
  try {
    const expiryTime = Date.now() + CACHE_DURATION
    
    if (role) {
      localStorage.setItem(ROLE_CACHE_KEY, role)
      localStorage.setItem(ROLE_CACHE_EXPIRY, expiryTime.toString())
      console.log('💾 Role Cache: Stored -', role, 'expires in', CACHE_DURATION / 1000 / 60, 'minutes')
    } else {
      clearRoleCache()
    }
  } catch (error) {
    console.error('❌ Role Cache: Error storing cache:', error)
  }
}

export function clearRoleCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(ROLE_CACHE_KEY)
    localStorage.removeItem(ROLE_CACHE_EXPIRY)
    console.log('🗑️ Role Cache: Cleared')
  } catch (error) {
    console.error('❌ Role Cache: Error clearing cache:', error)
  }
}

export async function fetchRoleWithCache(): Promise<string | null> {
  // Try cache first
  const cachedRole = getCachedRole()
  if (cachedRole) {
    return cachedRole
  }
  
  // Cache miss, fetch from API using consolidated endpoint
  console.log('🔍 Role Cache: Miss - fetching from consolidated session API')
  
  try {
    // Use the same consolidated endpoint as dashboard for consistency
    const response = await fetch('/api/user/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.warn('❌ Role Cache: Session API error:', response.status)
      return null
    }
    
    const sessionData = await response.json()
    const role = sessionData.user?.role || null
    
    // Cache the result
    setCachedRole(role)
    
    return role
  } catch (error) {
    console.error('❌ Role Cache: Network error:', error)
    return null
  }
}

// Hook for React components
import { useState, useEffect } from 'react'

export function useRoleCache() {
  const [role, setRole] = useState<string | null>(getCachedRole())
  const [loading, setLoading] = useState(!role) // If we have cache, don't show loading
  
  useEffect(() => {
    const loadRole = async () => {
      const roleResult = await fetchRoleWithCache()
      setRole(roleResult)
      setLoading(false)
    }
    
    // If no cached role, fetch it
    if (!role) {
      loadRole()
    }
  }, [role])
  
  const refreshRole = async () => {
    setLoading(true)
    clearRoleCache()
    const roleResult = await fetchRoleWithCache()
    setRole(roleResult)
    setLoading(false)
  }
  
  return { role, loading, refreshRole }
}