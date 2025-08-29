"use client";

import UserManagement from "@/components/admin/user-management";
import { DesktopHeader } from "@/components/ui/desktop-header";

export default function AdminUsersPage() {
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

      {/* Use consistent header */}
      <div className="relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl my-8 mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <UserManagement />
      </main>
    </div>
  );
}
