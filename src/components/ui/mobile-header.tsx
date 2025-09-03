"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MobileAdminActions, MobileCMSActions, MobileReminderActions } from "./mobile-admin-actions";

interface MobileHeaderProps {
  showNavigation?: boolean;
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
          <div className="flex items-center space-x-2">
            {/* Navigation Actions */}
            <MobileReminderActions />
            <MobileCMSActions />
            <MobileAdminActions />
            
            {/* User Button */}
            <div className="ml-2">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
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