"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import { Header } from "@/components/ui/header";
import { HeaderSkeleton } from "@/components/ui/dashboard-skeleton";
import { postLoginCacheCleanup } from "@/lib/cache-utils";
import { initializePWA } from "@/lib/pwa-utils";


export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [approvalStatus, setApprovalStatus] = useState<
    "loading" | "approved" | "pending" | "error"
  >("loading");

  useEffect(() => {
    // Wait for Clerk to load before checking authentication
    if (!isLoaded) return;

    // Redirect to sign-in if not authenticated after loading
    if (!user) {
      router.push("/sign-in");
      return;
    }

    // Check approval status when user is loaded
    checkApprovalStatus();
  }, [user, isLoaded, router]);

  const checkApprovalStatus = async () => {
    try {
      console.log("🔍 Dashboard: Starting consolidated session check");
      
      // Single consolidated API call replaces 3 separate calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const response = await fetch("/api/user/session", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const sessionData = await response.json();
        console.log("📊 Dashboard: Session data received:", {
          success: sessionData.success,
          authenticated: sessionData.session?.authenticated,
          role: sessionData.user?.role,
          canAccess: sessionData.user?.canAccessDashboard
        });
        
        console.log('🧹 Dashboard: Initiating post-login cache cleanup...');
        
        if (response.ok && sessionData.success) {
          setApprovalStatus("approved");
          console.log("✅ Dashboard: Session validated, accessing dashboard");
          
          // Clear browser cache after successful login to prevent development artifacts
          postLoginCacheCleanup().catch((error: any) => {
            console.warn('⚠️ Dashboard: Cache cleanup failed (non-critical):', error)
          });
          
          // Initialize PWA features after successful login
          initializePWA().catch((error: any) => {
            console.warn('⚠️ Dashboard: PWA initialization failed (non-critical):', error)
          });
        } else if (sessionData.needsApproval) {
          setApprovalStatus("pending");
          console.log("⏳ Dashboard: User needs approval, redirecting");
          router.push("/pending-approval");
        } else if (sessionData.needsLogin) {
          console.log("🔐 Dashboard: Authentication required, redirecting");
          router.push("/sign-in");
        } else {
          console.error("❌ Dashboard: Session validation failed:", sessionData.error);
          setApprovalStatus("error");
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error("❌ Dashboard: Session check failed:", error);
      
      // Enhanced error handling for consolidated endpoint
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error("❌ Dashboard: Session timeout - server may be slow");
        } else if (error.message.includes('fetch')) {
          console.error("❌ Dashboard: Network error - check connection");
        }
      }
      
      setApprovalStatus("error");
    }
  };

  // Show enhanced loading with header skeleton while Clerk is loading or checking approval
  if (!isLoaded || approvalStatus === "loading") {
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
                  {!isLoaded ? 'Menginisialisasi sistem...' : 'Memuat dashboard...'}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (approvalStatus === "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to approval page...</p>
        </div>
      </div>
    );
  }

  if (approvalStatus === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            Error loading user data. Please try again.
          </p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
