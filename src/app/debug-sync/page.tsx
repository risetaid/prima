'use client'

import { useState } from 'react'

export default function DebugSyncPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const syncUser = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/sync-user', { method: 'POST' })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to sync user' })
    } finally {
      setLoading(false)
    }
  }

  const checkUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/users')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to fetch users' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug User Sync</h1>
      
      <div className="space-x-4 mb-6">
        <button 
          onClick={syncUser}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync Current User to DB'}
        </button>
        
        <button 
          onClick={checkUsers}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Check Users in DB'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 space-x-4">
        <a href="/debug-auth" className="bg-gray-500 text-white px-4 py-2 rounded">Debug Auth</a>
        <a href="/dashboard" className="bg-purple-500 text-white px-4 py-2 rounded">Dashboard</a>
      </div>
    </div>
  )
}