'use client'

import { useUser, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function DebugAuth() {
  const { user, isLoaded } = useUser()
  const { isSignedIn, userId } = useAuth()
  const [apiResult, setApiResult] = useState<any>(null)

  useEffect(() => {
    if (isLoaded) {
      console.log('🔍 Debug Auth State:', {
        isLoaded,
        isSignedIn,
        userId,
        user: user?.id,
        email: user?.primaryEmailAddress?.emailAddress
      })

      // Test API call
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          console.log('🔍 API Response:', data)
          setApiResult(data)
        })
        .catch(err => {
          console.error('🔍 API Error:', err)
          setApiResult({ error: err.message })
        })
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="grid gap-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Clerk Client State</h2>
          <pre className="text-sm">
            {JSON.stringify({
              isLoaded,
              isSignedIn,
              userId,
              userEmail: user?.primaryEmailAddress?.emailAddress,
              userName: `${user?.firstName} ${user?.lastName}`.trim()
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">API Response</h2>
          <pre className="text-sm">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Session Storage</h2>
          <pre className="text-sm">
            {typeof window !== 'undefined' ? 
              JSON.stringify({
                sessionStorage: Object.keys(sessionStorage),
                localStorage: Object.keys(localStorage),
                cookies: document.cookie
              }, null, 2) : 'Not available on server'
            }
          </pre>
        </div>
      </div>
    </div>
  )
}