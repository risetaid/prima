"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import DashboardClient from "../dashboard-client";
import { Header } from "@/components/ui/header";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

export default function DashboardPage() {
  const { isLoaded } = useUser();

  useEffect(() => {
    // Initialize post-login optimizations
    // Since middleware handles all auth/approval checks, we can run these immediately
    if (isLoaded) {
      // Initialize any post-login operations here if needed
    }
  }, [isLoaded]);

  // Show loading while Clerk loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.png)",
            }}
          />
        </div>

        {/* Dashboard Skeleton */}
        <DashboardSkeleton />
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
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
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

