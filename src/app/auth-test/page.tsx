'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthTest() {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (authLoaded && userLoaded) {
      console.log('🔍 Auth Test Results:', {
        authLoaded,
        userLoaded,
        isSignedIn,
        userId,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      })
      
      if (isSignedIn) {
        console.log('✅ Authentication successful - redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('❌ Not signed in - redirecting to sign-in')
        router.push('/sign-in')
      }
    }
  }, [authLoaded, userLoaded, isSignedIn, router])

  if (!authLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Testing authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Auth Test Results</h1>
        
        <div className="space-y-4 text-left">
          <div>
            <strong>Auth Loaded:</strong> {authLoaded ? '✅' : '❌'}
          </div>
          <div>
            <strong>User Loaded:</strong> {userLoaded ? '✅' : '❌'}
          </div>
          <div>
            <strong>Signed In:</strong> {isSignedIn ? '✅' : '❌'}
          </div>
          <div>
            <strong>User ID:</strong> {userId || 'None'}
          </div>
          <div>
            <strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || 'None'}
          </div>
          <div>
            <strong>Name:</strong> {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'None'}
          </div>
        </div>
        
        <div className="mt-6 space-y-2">
          <button 
            onClick={() => router.push('/sign-in')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Go to Sign In
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}