"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TemplateManagement from "@/components/admin/template-management";
import { DesktopHeader } from "@/components/ui/desktop-header";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.role !== "ADMIN") {
          toast.error("Akses Ditolak", {
            description: "Anda tidak memiliki akses ke halaman admin."
          });
          router.push("/dashboard");
          return;
        }
        setHasAccess(true);
      } else {
        router.push("/handler/signin");
        return;
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
      return;
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
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

      {/* Desktop Header */}
      <div className="hidden lg:block relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white shadow-sm">
          <div className="flex items-center px-4 py-4">
            <button
              onClick={() => router.push("/dashboard/admin")}
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2">
              <MessageSquareText className="w-5 h-5 text-green-600" />
              <h1 className="text-lg font-semibold text-gray-900">Template WhatsApp</h1>
            </div>
          </div>
        </header>
      </div>

      {/* Page Title - Desktop Only */}
      <div className="hidden lg:block relative z-10 bg-blue-600 text-white py-6">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center space-x-3">
            <MessageSquareText className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Template WhatsApp</h1>
          </div>
          <p className="text-blue-100 mt-2">
            Kelola template pesan WhatsApp untuk pengingat, janji, dan edukasi
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl my-4 lg:my-8 mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <TemplateManagement />
      </main>
    </div>
  );
}