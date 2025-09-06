import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/patients(.*)',
  '/api/admin(.*)',
  '/api/reminders(.*)',
  '/api/user(.*)',
  '/api/upload(.*)'
])

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/pending-approval',
  '/unauthorized'
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  
  // Handle legacy route redirects
  if (pathname === '/pengingat') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard/pengingat'
    return NextResponse.redirect(url)
  }
  
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect dashboard and API routes
  if (isProtectedRoute(req)) {
    try {
      await auth.protect()
    } catch (error) {
      // Only log non-redirect errors to reduce noise
      if (!(error && typeof error === 'object' && 'digest' in error && typeof (error as { digest?: string }).digest === 'string' && (error as { digest: string }).digest.includes('REDIRECT'))) {
        console.error('❌ Middleware: Auth protect failed for', pathname, error)
      }
      
      // Re-throw the error to let Clerk handle it properly
      throw error
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}