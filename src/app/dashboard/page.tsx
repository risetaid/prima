"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import { DesktopHeader } from "@/components/ui/desktop-header";
import { UserButton } from "@clerk/nextjs";
import { Shield } from "lucide-react";

function MobileAdminActions() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  if (userRole !== "ADMIN") {
    return null;
  }

  return (
    <button
      onClick={() => router.push("/dashboard/admin")}
      className="p-2 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
      title="Superadmin Panel"
    >
      <Shield className="w-5 h-5 text-purple-600" />
    </button>
  );
}

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

      {/* Desktop: Header with Navigation */}
      <div className="hidden lg:block relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Mobile: Enhanced Header */}
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
            
            {/* Mobile Admin & User Actions */}
            <div className="flex items-center space-x-3">
              <MobileAdminActions />
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
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
