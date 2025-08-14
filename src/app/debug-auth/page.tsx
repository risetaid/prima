import { currentUser } from '@clerk/nextjs/server'

export default async function DebugAuthPage() {
  const user = await currentUser()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication State</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">User Object:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4">
        <p><strong>Is Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
        {user && (
          <>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}</p>
            <p><strong>First Name:</strong> {user.firstName}</p>
          </>
        )}
      </div>
      
      <div className="mt-6 space-x-4">
        <a href="/sign-in" className="bg-blue-500 text-white px-4 py-2 rounded">Go to Sign In</a>
        <a href="/sign-up" className="bg-green-500 text-white px-4 py-2 rounded">Go to Sign Up</a>
        <a href="/dashboard" className="bg-purple-500 text-white px-4 py-2 rounded">Go to Dashboard</a>
        <button 
          onClick={() => fetch('/api/debug/sync-user', { method: 'POST' }).then(() => window.location.reload())}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Sync User to DB
        </button>
        <a href="/api/debug/users" className="bg-gray-500 text-white px-4 py-2 rounded">View Users</a>
      </div>
    </div>
  )
}