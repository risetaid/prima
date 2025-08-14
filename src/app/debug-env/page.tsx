export default function DebugEnvPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Environment Variables</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Clerk Public Key:</h2>
          <p className="font-mono text-sm">{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'NOT SET'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Clerk Secret Key:</h2>
          <p className="font-mono text-sm">{process.env.CLERK_SECRET_KEY ? 'SET (hidden)' : 'NOT SET'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">URLs:</h2>
          <p><strong>Sign In URL:</strong> {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'NOT SET'}</p>
          <p><strong>Sign Up URL:</strong> {process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'NOT SET'}</p>
          <p><strong>After Sign In:</strong> {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'NOT SET'}</p>
          <p><strong>After Sign Up:</strong> {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || 'NOT SET'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Database:</h2>
          <p><strong>Database URL:</strong> {process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Other:</h2>
          <p><strong>Node Env:</strong> {process.env.NODE_ENV}</p>
          <p><strong>Vercel:</strong> {process.env.VERCEL ? 'Yes' : 'No'}</p>
        </div>
      </div>
      
      <div className="mt-6 space-x-4">
        <a href="/debug-auth" className="bg-blue-500 text-white px-4 py-2 rounded">Debug Auth</a>
        <a href="/dashboard" className="bg-green-500 text-white px-4 py-2 rounded">Dashboard</a>
      </div>
    </div>
  )
}