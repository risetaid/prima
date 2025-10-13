"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  MessageSquareText,
  Settings,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/ui/header";
import { toast } from "sonner";
import { Patient } from "@/db/schema";

import { logger } from '@/lib/logger';
export default function AdminPanelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingUsers: 0,
    totalUsers: 0,
    totalTemplates: 0,
    activePatients: 0,
  });

  useEffect(() => {
    // Since middleware with auth.protect() already handles admin access,
    // we can directly fetch the stats
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user stats
      const usersResponse = await fetch("/api/admin/users");
      if (usersResponse.ok) {
        const usersResult = await usersResponse.json();
        const usersData = usersResult.data || usersResult; // Unwrap createApiHandler response

        logger.info("Admin users API response", {
          success: usersResult.success,
          hasData: !!usersResult.data,
          hasUsers: !!usersData.users,
          usersCount: usersData.users?.length,
          pagination: usersData.pagination,
          pendingCount: usersData.pendingCount,
          totalInPagination: usersData.pagination?.total
        });

        setStats((prev) => ({
          ...prev,
          pendingUsers: usersData.pendingCount || 0,
          totalUsers: usersData.pagination?.total || 0,
        }));
      } else {
        logger.error("Failed to fetch admin users", undefined, {
          status: usersResponse.status,
          statusText: usersResponse.statusText
        });
      }

      // Fetch template stats
      const templatesResponse = await fetch("/api/admin/templates");
      if (templatesResponse.ok) {
        const templatesResult = await templatesResponse.json();
        const templatesData = templatesResult.data || templatesResult; // Unwrap createApiHandler response

        setStats((prev) => ({
          ...prev,
          totalTemplates: templatesData.templates?.length || 0,
        }));
      }

      // Fetch patient stats
      const patientsResponse = await fetch("/api/patients");
      if (patientsResponse.ok) {
        const patientsResult = await patientsResponse.json();
        const patientsData = patientsResult.data || patientsResult; // Unwrap createApiHandler response

        const activePatients =
          patientsData.patients?.filter((p: Patient) => p.isActive)?.length ||
          0;
        setStats((prev) => ({
          ...prev,
          activePatients,
        }));
      }
    } catch (error: unknown) {
      logger.error("Failed to fetch admin stats:", error instanceof Error ? error : new Error(String(error)));
      toast.error("Gagal memuat statistik admin");
    } finally {
      setLoading(false);
    }
  };

  const adminMenuItems = [
    {
      title: "Manajemen Pengguna",
      description: "Kelola approval dan role pengguna sistem",
      icon: Users,
      href: "/admin/users",
      badge: stats.pendingUsers > 0 ? `${stats.pendingUsers} menunggu` : null,
      badgeType: "warning" as const,
      stats: `${stats.totalUsers} total pengguna`,
    },
    {
      title: "Template WhatsApp",
      description: "Kelola template pesan otomatis",
      icon: MessageSquareText,
      href: "/admin/templates",
      badge: null,
      badgeType: null,
      stats: `${stats.totalTemplates} template aktif`,
    },
  ];

  const quickActions = [
    {
      title: "Pengaturan Sistem",
      description: "Konfigurasi sistem dan preferensi",
      icon: Settings,
      href: "/admin/settings",
      color: "bg-gray-500 hover:bg-gray-600",
    },
  ];

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

        <Header showNavigation={true} className="relative z-10" />

        <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        </main>
      </div>
    );
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

      <Header showNavigation={true} className="relative z-10" />

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Pengguna
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Menunggu Approval
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.pendingUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquareText className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Template WhatsApp
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalTemplates}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pasien Aktif
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.activePatients}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Menu Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {adminMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(item.href)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 mr-3">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        {item.badge && (
                          <span
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                              item.badgeType === "warning"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{item.description}</p>
                      {item.stats && (
                        <p className="text-sm text-gray-500">{item.stats}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className={`${action.color} text-white p-4 rounded-lg transition-colors text-left`}
                >
                  <div className="flex items-start">
                    <IconComponent className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
