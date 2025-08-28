"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import { DesktopHeader } from "@/components/ui/desktop-header";
import { UserMenu } from "@/components/ui/user-menu";

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const [approvalStatus, setApprovalStatus] = useState<
    "loading" | "approved" | "pending" | "error"
  >("loading");

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (!user) {
      router.push("/handler/signin");
      return;
    }

    // Check approval status when user is loaded
    checkApprovalStatus();
  }, [user, router]);

  const checkApprovalStatus = async () => {
    try {
      // First ensure user exists and is synced
      const syncResponse = await fetch("/api/auth/update-last-login", {
        method: "POST",
      });

      if (!syncResponse.ok) {
        console.error("Failed to sync user");
        setApprovalStatus("error");
        return;
      }

      // Then check user status (doesn't require approval)
      const response = await fetch("/api/user/status");
      if (response.ok) {
        const userData = await response.json();
        if (userData.canAccessDashboard) {
          setApprovalStatus("approved");
        } else {
          setApprovalStatus("pending");
          router.push("/pending-approval");
        }
      } else {
        setApprovalStatus("error");
      }
    } catch (error) {
      console.error("Error checking approval status:", error);
      setApprovalStatus("error");
    }
  };

  if (approvalStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

      {/* Desktop: Header with Navigation */}
      <div className="hidden lg:block relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Mobile: Simple Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
            </div>
            <UserMenu />
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="relative z-10">
        <DashboardClient />
      </main>
    </div>
  );
}
