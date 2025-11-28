import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/pasien(.*)",
  "/pengingat(.*)",
  "/berita(.*)",
  "/video-edukasi(.*)",
  "/cms(.*)",
  "/admin(.*)",
  "/api/patients(.*)",
  "/api/admin(.*)",
  "/api/reminders(.*)",
  "/api/user(.*)",
  "/api/upload(.*)",
  "/api/content(.*)",
  "/api/cms(.*)",
  "/api/dashboard(.*)",
]);

// Use CLERK_SECRET_KEY as internal API key for testing/service calls
// This is secure because CLERK_SECRET_KEY is already a sensitive credential
const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || process.env.CLERK_SECRET_KEY;

export default clerkMiddleware(async (auth, req) => {
  // Check for internal API key bypass (for load testing and internal services)
  // Uses CLERK_SECRET_KEY as the API key - same security level as Clerk admin access
  const apiKey = req.headers.get("X-API-Key");
  if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
    // Valid internal API key - allow request to proceed
    return NextResponse.next();
  }

  // Protect routes using Clerk's built-in protection
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
