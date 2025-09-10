"use client";

import UserManagement from "@/components/admin/user-management";
import { Header } from "@/components/ui/header";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { BackButton } from '@/components/ui/back-button';

export default function AdminUsersPage() {
  const router = useRouter();

  return (
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
              <BackButton variant="simple" className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600" text="" />
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
            Kelola persetujuan, status, dan role pengguna sistem (hanya Admin)
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl my-4 lg:my-8 mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <UserManagement />
      </main>
    </div>
  );
}
