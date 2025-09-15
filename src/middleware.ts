import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/pasien(.*)',
  '/pengingat(.*)',
  '/berita(.*)',
  '/video-edukasi(.*)',
  '/cms(.*)',
  '/admin(.*)',
  '/api/patients(.*)',
  '/api/admin(.*)',
  '/api/reminders(.*)',
  '/api/user(.*)',
  '/api/upload(.*)',
  '/api/content(.*)',
  '/api/cms(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // Protect routes using Clerk's built-in protection
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

