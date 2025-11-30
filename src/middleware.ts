import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

// Check if request has valid internal API key for testing/service calls
function hasValidApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("X-API-Key");
  return !!(apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY);
}

// Clerk middleware with conditional protection
const clerkProtection = clerkMiddleware(async (auth, req) => {
  // Skip Clerk protection if valid API key is present
  if (hasValidApiKey(req)) {
    return NextResponse.next();
  }

  // Protect routes using Clerk's built-in protection
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// Main middleware - check API key first, then Clerk
export default async function middleware(req: NextRequest) {
  // Fast path: if valid API key, bypass Clerk entirely
  if (hasValidApiKey(req)) {
    return NextResponse.next();
  }

  // Otherwise, use Clerk middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clerkProtection(req, {} as any);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
