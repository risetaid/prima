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

// Internal API key for automated testing and service-to-service calls
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export default clerkMiddleware(async (auth, req) => {
  // Check for internal API key bypass (for load testing and internal services)
  const apiKey = req.headers.get("X-API-Key");
  if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
    // Valid internal API key - allow request to proceed
    // The route handler should check for this header and handle accordingly
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
