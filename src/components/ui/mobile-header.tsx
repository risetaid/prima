"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MobileAdminActions, MobileCMSActions, MobileReminderActions, MobileBeritaActions, MobileVideoActions, MobilePasienActions } from "./mobile-admin-actions";
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
          className="p-2 rounded-full bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white transition-colors"
          title="Dashboard"
        >
          <Home className="w-5 h-5" />
        </button>
        
        {/* CMS for ADMIN/SUPERADMIN */}
        {(userRole === 'ADMIN' || userRole === 'SUPERADMIN') && (
          <MobileCMSActions />
        )}
        
        {/* Superadmin Panel for SUPERADMIN */}
        {userRole === 'SUPERADMIN' && (
          <MobileAdminActions />
        )}
        
        <div className="ml-2">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }
  
  // For other pages, show full navigation
  if (userRole === 'MEMBER') {
    // MEMBER users see: Pasien (view-only), Pengingat, Berita, Video Edukasi
    return (
      <div className="flex items-center space-x-2">
        <MobilePasienActions />  
        <MobileReminderActions />
        <MobileBeritaActions />
        <MobileVideoActions />
        <div className="ml-2">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    );
  }
  
  // ADMIN and SUPERADMIN see all navigation options
  return (
    <div className="flex items-center space-x-2">
      <MobilePasienActions />
      <MobileReminderActions />
      <MobileBeritaActions />
      <MobileVideoActions />
      <MobileCMSActions />
      <MobileAdminActions />
      <div className="ml-2">
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