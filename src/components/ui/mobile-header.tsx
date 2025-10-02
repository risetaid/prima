"use client";

import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import {
  MobileAdminActions,
  MobileCMSActions,
  MobilePasienActions,
} from "@/components/ui/mobile-admin-actions";
import { useAuthContext } from "@/lib/auth-context";
// Role cache temporarily disabled
import { UserCheck } from "lucide-react";

interface MobileHeaderProps {
  showNavigation?: boolean;
}

// Role-based mobile navigation component
function MobileNavigationActions() {
  const { role: userRole } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  // If on homepage, show simplified navigation
  if (pathname === "/") {
    return (
      <div className="flex items-center space-x-2">
        {/* Dashboard Button */}
        <button
          onClick={() => router.push("/pasien")}
          className="p-1.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors touch-manipulation"
          title="Pasien"
        >
          <UserCheck className="w-4 h-4" />
        </button>

        {/* Management actions for ADMIN/DEVELOPER */}
        {(userRole === "ADMIN" || userRole === "DEVELOPER") && (
          <MobileCMSActions />
        )}

        {/* Admin Panel for DEVELOPER only */}
        {userRole === "DEVELOPER" && <MobileAdminActions />}

        <div className="ml-2">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }

  // For other pages, show role-specific navigation
  if (userRole === "RELAWAN") {
    // RELAWAN users see: Only basic navigation - features available in blue nav
    return (
      <div className="flex items-center">
        {/* Fixed User Button */}
        <div className="ml-2 flex-shrink-0">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }

  if (userRole === "ADMIN") {
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

  // DEVELOPER users see: Pasien + CMS + Admin Panel (management functions only)
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
  const { user } = useAuthContext();
  const router = useRouter();

  return (
    <header className="lg:hidden bg-white shadow-sm relative z-10">
      <div className="flex justify-between items-center px-4 py-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div
            className="cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Image
              src="/icons/ios/1024.png"
              alt="PRIMA Logo"
              width={24}
              height={24}
              className="w-6 h-6"
              priority={true}
            />
          </div>
          <h1
            className="text-2xl font-bold text-blue-600 cursor-pointer"
            onClick={() => router.push("/kredit")}
          >
            PRIMA
          </h1>
        </div>

        {/* Mobile Actions & User Menu */}
        {showNavigation && user && <MobileNavigationActions />}

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
