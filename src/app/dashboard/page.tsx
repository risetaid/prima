'use client'

import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, BarChart3, HelpCircle, Plus } from 'lucide-react'
import DashboardClient from './dashboard-client'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'approved' | 'pending' | 'error'>('loading')

  useEffect(() => {
    // Only redirect if Clerk has fully loaded AND user is null
    if (isLoaded && !user) {
      router.push('/sign-in')
      return
    }
    
    // Check approval status when user is loaded
    if (isLoaded && user) {
      checkApprovalStatus()
    }
  }, [isLoaded, user, router])

  const checkApprovalStatus = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const userData = await response.json()
        if (userData.isApproved) {
          setApprovalStatus('approved')
          updateLastLogin()
        } else {
          setApprovalStatus('pending')
          router.push('/pending-approval')
        }
      } else {
        setApprovalStatus('error')
      }
    } catch (error) {
      console.error('Error checking approval status:', error)
      setApprovalStatus('error')
    }
  }

  const updateLastLogin = async () => {
    try {
      await fetch('/api/auth/update-last-login', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Failed to update last login:', error)
    }
  }

  if (!isLoaded || approvalStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || approvalStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (approvalStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading user data. Please try again.</p>
          <button 
            onClick={() => router.refresh()} 
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile First */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6">
        <div className="px-4">
          <DashboardClient />
        </div>
      </main>
    </div>
  )
}