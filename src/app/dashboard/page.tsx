"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import { Header } from "@/components/ui/header";


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
      console.log("🔍 Dashboard: Starting approval status check");
      
      // Add timeout wrapper for API calls
      const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      // First ensure user exists and is synced
      console.log("🔍 Dashboard: Syncing user login");
      const syncResponse = await fetchWithTimeout("/api/auth/update-last-login", {
        method: "POST",
      });

      if (!syncResponse.ok) {
        console.error("❌ Dashboard: Failed to sync user:", syncResponse.status);
        setApprovalStatus("error");
        return;
      }

      // Then check user status (doesn't require approval)
      console.log("🔍 Dashboard: Checking user status");
      const response = await fetchWithTimeout("/api/user/status");
      
      if (response.ok) {
        const userData = await response.json();
        console.log("✅ Dashboard: User status received:", userData);
        
        if (userData.canAccessDashboard) {
          setApprovalStatus("approved");
          console.log("✅ Dashboard: User approved, accessing dashboard");
        } else {
          setApprovalStatus("pending");
          console.log("⏳ Dashboard: User pending approval, redirecting");
          router.push("/pending-approval");
        }
      } else {
        console.error("❌ Dashboard: Failed to check user status:", response.status);
        setApprovalStatus("error");
      }
    } catch (error) {
      console.error("❌ Dashboard: Error checking approval status:", error);
      
      // Check if it's a timeout or network error
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error("❌ Dashboard: Request timeout - check network connection");
        } else if (error.message.includes('fetch')) {
          console.error("❌ Dashboard: Network error - check internet connection");
        }
      }
      
      setApprovalStatus("error");
    }
  };

  // Show loading while Clerk is loading or while checking approval status
  if (!isLoaded || approvalStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!isLoaded ? 'Initializing...' : 'Loading dashboard...'}
          </p>
        </div>
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
