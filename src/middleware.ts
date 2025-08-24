import { NextRequest, NextResponse } from 'next/server'

// Temporary: Simple middleware without Stack Auth
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // For now, just pass everything through
  // We'll add Stack Auth middleware back in Phase 3
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}