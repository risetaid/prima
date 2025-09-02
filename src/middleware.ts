import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/patients(.*)',
  '/api/admin(.*)',
  '/api/reminders(.*)',
  '/api/user(.*)',
  '/api/cron(.*)',
  '/api/upload(.*)'
])

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/pending-approval',
  '/unauthorized'
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  const userAgent = req.headers.get('user-agent') || ''
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
  
  // Enhanced debugging for all protected routes
  if (pathname.startsWith('/dashboard')) {
    try {
      const { userId } = await auth()
    } catch (error) {
    }
  }

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
    await auth.protect()
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