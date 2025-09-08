import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/patients(.*)',
  '/api/admin(.*)',
  '/api/reminders(.*)',
  '/api/user(.*)',
  '/api/upload(.*)',
  '/api/content(.*)',
  '/api/cms(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // Handle legacy route redirects
  if (req.nextUrl.pathname === '/pengingat') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard/pengingat'
    return Response.redirect(url)
  }
  
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