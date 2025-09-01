import { NextResponse } from 'next/server'

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const secretKey = process.env.CLERK_SECRET_KEY
  
  // Log keys for debugging (first/last few characters only for security)
  const maskedPublishable = publishableKey 
    ? `${publishableKey.substring(0, 10)}...${publishableKey.slice(-10)}`
    : 'NOT SET'
  
  const maskedSecret = secretKey
    ? `${secretKey.substring(0, 10)}...${secretKey.slice(-10)}`
    : 'NOT SET'

  console.log('🔍 Clerk Keys Debug:')
  console.log('  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', maskedPublishable)
  console.log('  CLERK_SECRET_KEY:', maskedSecret)
  
  // Check if keys are from same environment
  const publishableEnv = publishableKey?.includes('test') ? 'test' : 
                        publishableKey?.includes('live') ? 'live' : 'unknown'
  const secretEnv = secretKey?.includes('test') ? 'test' : 
                   secretKey?.includes('live') ? 'live' : 'unknown'

  const keysMatch = publishableEnv === secretEnv && publishableEnv !== 'unknown'

  return NextResponse.json({
    publishableKey: maskedPublishable,
    secretKey: maskedSecret,
    publishableEnv,
    secretEnv,
    keysMatch,
    recommendation: keysMatch 
      ? 'Keys appear to be from the same environment' 
      : 'Keys may be from different environments - check Clerk dashboard'
  })
}