"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TemplateManagement from "@/components/admin/template-management";
import { TemplateManagementSkeleton } from "@/components/ui/dashboard-skeleton";
import { Header } from "@/components/ui/header";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.role !== "SUPERADMIN" && data.role !== "ADMIN") {
          toast.error("Akses Ditolak", {
            description: "Anda tidak memiliki akses ke halaman admin."
          });
          router.push("/dashboard");
          return;
        }
        setHasAccess(true);
      } else {
        router.push("/sign-in");
        return;
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleSeedTemplates = async () => {
    setIsSeedModalOpen(true);
  };

  const confirmSeedTemplates = async () => {
    setSeeding(true);
    try {
      const response = await fetch('/api/admin/templates/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Template berhasil ditambahkan!`, {
          description: `Dibuat: ${data.stats.created}, Dilewati: ${data.stats.skipped}`
        });

        // Refresh the page to show new templates
        window.location.reload();
      } else {
        toast.error(data.error || 'Gagal menambahkan template');
      }
    } catch (error) {
      console.error('Error seeding templates:', error);
      toast.error('Terjadi kesalahan saat menambahkan template');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
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
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Template Pesan</h1>
              <div className="w-8"></div>
            </div>
          </header>
        </div>

        {/* Main Content with Skeleton */}
        <main className="relative z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <TemplateManagementSkeleton />
          </div>
        </main>
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
        <div className="px-8">
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
        <TemplateManagement onSeedTemplates={handleSeedTemplates} seeding={seeding} />
      </main>

      {/* Seed Templates Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onConfirm={confirmSeedTemplates}
        title="Tambahkan Template Default"
        description="Apakah Anda yakin ingin menambahkan template default? Template yang sudah ada tidak akan diganti."
        confirmText="Ya, Tambahkan"
        cancelText="Batal"
        loading={seeding}
      />
    </div>
  );
}