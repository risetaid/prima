"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MobileAdminActions, MobileCMSActions, MobilePasienActions } from "./mobile-admin-actions";
import { useRoleCache } from "@/lib/role-cache";
import { Home } from "lucide-react";

interface MobileHeaderProps {
  showNavigation?: boolean;
}

// Role-based mobile navigation component
function MobileNavigationActions() {
  const { role: userRole } = useRoleCache();
  const pathname = usePathname();
  const router = useRouter();
  
  // If on homepage, show simplified navigation
  if (pathname === "/") {
    return (
      <div className="flex items-center space-x-2">
        {/* Dashboard Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="p-1.5 rounded-full bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white transition-colors touch-manipulation"
          title="Dashboard"
        >
          <Home className="w-4 h-4" />
        </button>
        
        {/* Management actions for ADMIN/SUPERADMIN */}
        {(userRole === 'ADMIN' || userRole === 'SUPERADMIN') && (
          <MobileCMSActions />
        )}
        
        {/* Superadmin Panel for SUPERADMIN only */}
        {userRole === 'SUPERADMIN' && (
          <MobileAdminActions />
        )}
        
        <div className="ml-2">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }
  
  // For other pages, show role-specific navigation
  if (userRole === 'MEMBER') {
    // MEMBER users see: Only Pasien (view-only) - other features available in blue nav
    return (
      <div className="flex items-center">
        <MobilePasienActions />
        {/* Fixed User Button */}
        <div className="ml-2 flex-shrink-0">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }
  
  if (userRole === 'ADMIN') {
    // ADMIN users see: Pasien + CMS (management functions only)
    return (
      <div className="flex items-center">
        <div className="flex items-center space-x-1">
          <MobilePasienActions />
          <MobileCMSActions />
        </div>
        {/* Fixed User Button */}
        <div className="ml-2 flex-shrink-0">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }
  
  // SUPERADMIN users see: Pasien + CMS + Superadmin Panel (management functions only)
  return (
    <div className="flex items-center">
      <div className="flex items-center space-x-1">
        <MobilePasienActions />
        <MobileCMSActions />
        <MobileAdminActions />
      </div>
      {/* Fixed User Button */}
      <div className="ml-2 flex-shrink-0">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  );
}

export function MobileHeader({ showNavigation = true }: MobileHeaderProps) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <header className="lg:hidden bg-white shadow-sm relative z-10">
      <div className="flex justify-between items-center px-4 py-4">
        {/* Logo */}
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
        </div>

        {/* Mobile Actions & User Menu */}
        {showNavigation && user && (
          <MobileNavigationActions />
        )}

        {/* Sign In Button for unauthenticated users */}
        {showNavigation && !user && (
          <button
            onClick={() => router.push("/sign-in")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Masuk
          </button>
        )}
      </div>
    </header>
  );
}