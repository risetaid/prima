"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Users, MessageSquareText, Settings, Bug, ChevronRight, AlertCircle, FlaskConical } from "lucide-react";
import { DesktopHeader } from "@/components/ui/desktop-header";
import { toast } from "sonner";

export default function AdminPanelPage() {
  const { user } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingUsers: 0,
    totalUsers: 0,
    totalTemplates: 0,
    activePatients: 0
  });

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardStats();
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
        setUserRole(data.role);
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
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch user stats
      const usersResponse = await fetch("/api/admin/users");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setStats(prev => ({ 
          ...prev, 
          pendingUsers: usersData.pendingCount || 0,
          totalUsers: usersData.count || 0
        }));
      }

      // Fetch template stats
      const templatesResponse = await fetch("/api/admin/templates");
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setStats(prev => ({ 
          ...prev, 
          totalTemplates: templatesData.templates?.length || 0
        }));
      }

      // Fetch patient stats
      const patientsResponse = await fetch("/api/dashboard/overview");
      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        const activeCount = patientsData.patients.filter((p: any) => p.isActive).length;
        setStats(prev => ({ 
          ...prev, 
          activePatients: activeCount 
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const adminMenuItems = [
    {
      title: "Manajemen Pengguna",
      description: "Kelola persetujuan pengguna dan hak akses",
      icon: Users,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      path: "/dashboard/admin/users",
      badge: stats.pendingUsers > 0 ? stats.pendingUsers : null,
      badgeColor: "bg-red-500",
      stats: `${stats.totalUsers} pengguna terdaftar`
    },
    {
      title: "Template WhatsApp",
      description: "Kelola template pesan untuk pengingat dan notifikasi",
      icon: MessageSquareText,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      path: "/dashboard/admin/templates",
      badge: null,
      badgeColor: "",
      stats: `${stats.totalTemplates} template tersedia`
    },
    {
      title: "Sistem Settings",
      description: "Konfigurasi sistem dan pengaturan global",
      icon: Settings,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      path: "/dashboard/admin/settings",
      badge: null,
      badgeColor: "",
      stats: "Coming Soon",
      disabled: true
    }
  ];

  const developmentTools = [
    {
      title: "Debug Webhook",
      description: "Test dan debug integrasi WhatsApp",
      icon: Bug,
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      path: "/debug-webhook",
      badge: null,
      badgeColor: "",
      stats: "Development Only"
    },
    {
      title: "Test WhatsApp API",
      description: "Testing pengiriman pesan WhatsApp langsung",
      icon: FlaskConical,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      path: "/dashboard/test-whatsapp",
      badge: null,
      badgeColor: "",
      stats: "Testing Tool"
    }
  ];

  const handleNavigation = (path: string, disabled?: boolean) => {
    if (disabled) {
      toast.info("Fitur Segera Hadir", {
        description: "Fitur ini sedang dalam pengembangan"
      });
      return;
    }
    router.push(path);
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

  if (userRole !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600">Anda tidak memiliki akses ke halaman admin.</p>
        </div>
      </div>
    );
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
      <div className="relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Header Section */}
      <div className="bg-blue-600 text-white py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="w-12 h-12 text-white" />
              <h1 className="text-4xl font-bold">Admin Panel</h1>
            </div>
            <p className="text-xl text-blue-100">
              Panel kontrol untuk manajemen sistem PRIMA
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pengguna</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <MessageSquareText className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pasien Aktif</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePatients}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Functions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Fungsi Administrasi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={index}
                  onClick={() => handleNavigation(item.path, item.disabled)}
                  className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                    item.disabled ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${item.color} ${item.hoverColor} p-3 rounded-lg transition-colors`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.badge && (
                          <span className={`${item.badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {item.stats}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Development Tools */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Development Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {developmentTools.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    onClick={() => handleNavigation(item.path)}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${item.color} ${item.hoverColor} p-3 rounded-lg transition-colors`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          {item.stats}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity or System Status could go here */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Sistem</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">WhatsApp API - Online</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database - Connected</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Cron Jobs - Running</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}