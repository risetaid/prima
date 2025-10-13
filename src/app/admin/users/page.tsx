"use client";

import { LazyUserManagement } from "@/components/admin/lazy-components";
import { Header } from "@/components/ui/header";
import { RoleGuard } from "@/components/auth/role-guard";

import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "DEVELOPER"]}>
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

      {/* Desktop Header */}
      <div className="hidden lg:block relative z-10">
        <Header showNavigation={true} />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white shadow-sm">
          <div className="flex items-center px-4 py-4">
            <div className="mr-4">
              <button
                onClick={() => window.location.href = '/admin'}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
               <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            </div>
          </div>
        </header>
      </div>

      {/* Page Title - Desktop Only */}
      <div className="hidden lg:block relative z-10 bg-purple-600 text-white py-6">
        <div className="px-8">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-purple-100 mt-2">
            Kelola persetujuan, status, dan role pengguna sistem (Admin & Developer)
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl my-4 lg:my-8 mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <LazyUserManagement />
      </main>
      </div>
    </RoleGuard>
  );
}

