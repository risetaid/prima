"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import DashboardClient from "./dashboard-client";
import { Header } from "@/components/ui/header";
import { HeaderSkeleton } from "@/components/ui/dashboard-skeleton";
import { postLoginCacheCleanup, clearRoleCacheOnLogout } from "@/lib/cache-utils";
import { initializePWA } from "@/lib/pwa-utils";

export default function DashboardPage() {
  const { isLoaded } = useUser();

  useEffect(() => {
    // Initialize post-login optimizations
    // Since middleware handles all auth/approval checks, we can run these immediately
    if (isLoaded) {
      // Clear role cache to prevent stale role data
      clearRoleCacheOnLogout();
      
      // Clear browser cache after successful login (non-blocking)
      postLoginCacheCleanup().catch((error: any) => {
        console.warn('⚠️ Dashboard: Cache cleanup failed (non-critical):', error)
      });
      
      // Initialize PWA features (non-blocking)
      initializePWA().catch((error: any) => {
        console.warn('⚠️ Dashboard: PWA initialization failed (non-critical):', error)
      });
    }
  }, [isLoaded]);

  // Show loading while Clerk loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.png)",
            }}
          />
        </div>

        {/* Header Skeleton */}
        <div className="relative z-10">
          <HeaderSkeleton />
        </div>

        {/* Loading Content */}
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-gray-700 font-medium">
                  Menginisialisasi sistem...
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Since middleware already handles auth protection with auth.protect(),
  // we can render the dashboard directly without additional checks
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Responsive Header */}
      <Header showNavigation={true} className="relative z-10" />

      {/* Main Content */}
      <main className="relative z-10">
        <DashboardClient />
      </main>
    </div>
  );
}