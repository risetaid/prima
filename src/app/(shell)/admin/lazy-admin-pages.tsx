"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";
import { AnalyticsDashboardSkeleton, DashboardHeaderSkeleton } from "@/components/ui/skeleton";

// Loading components for admin pages
const AdminPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 relative">
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{
          backgroundImage: "url(/bg_desktop.png)",
        }}
      />
    </div>
    <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
      <DashboardHeaderSkeleton className="mb-8" />
      <AnalyticsDashboardSkeleton />
    </main>
  </div>
);

const UserManagementSkeleton = () => (
  <div className="space-y-6">
    <DashboardHeaderSkeleton />
    <div className="grid gap-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TemplateManagementSkeleton = () => (
  <div className="space-y-6">
    <DashboardHeaderSkeleton />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="flex justify-between pt-2">
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Lazy loaded admin pages with route-based code splitting
export const LazyAdminUsersPage = dynamic(
  () => import("./users/page").then((mod) => ({ default: mod.default })),
  {
    loading: () => <AdminPageSkeleton />,
    ssr: false, // Admin pages don't need SSR
  }
) as ComponentType<Record<string, never>>;

export const LazyAdminTemplatesPage = dynamic(
  () => import("./templates/page").then((mod) => ({ default: mod.default })),
  {
    loading: () => <AdminPageSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

export const LazyAdminLLMAnalyticsPage = dynamic(
  () => import("./llm-analytics/page").then((mod) => ({ default: mod.default })),
  {
    loading: () => <AdminPageSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

// Lazy loaded admin components (already created in lazy-components.tsx)
export const LazyUserManagementComponent = dynamic(
  () => import("@/components/admin/user-management").then((mod) => ({ default: mod.default })),
  {
    loading: () => <UserManagementSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

export const LazyTemplateManagementComponent = dynamic(
  () => import("@/components/admin/template-management").then((mod) => ({ default: mod.default })),
  {
    loading: () => <TemplateManagementSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

// Lazy loaded analytics components
export const LazyComprehensiveAnalytics = dynamic(
  () => import("@/components/admin/comprehensive-analytics-dashboard").then((mod) => ({
    default: mod.ComprehensiveAnalyticsDashboard,
  })),
  {
    loading: () => <AnalyticsDashboardSkeleton />,
    ssr: false,
  }
) as ComponentType<{ className?: string }>;

export const LazyLLMAnalytics = dynamic(
  () => import("@/components/admin/llm-analytics-dashboard").then((mod) => ({
    default: mod.LLMAnalyticsDashboard,
  })),
  {
    loading: () => <AnalyticsDashboardSkeleton />,
    ssr: false,
  }
) as ComponentType<{ className?: string }>;

// HOC for protecting admin routes with lazy loading
export function withAdminProtection<P extends object>(
  Component: ComponentType<P>,
  FallbackComponent?: ComponentType<Record<string, never>>
) {
  const ProtectedComponent = dynamic(
    () => Promise.resolve({ default: Component }),
    {
      loading: () => FallbackComponent ? <FallbackComponent /> : <AdminPageSkeleton />,
      ssr: false,
    }
  );

  return ProtectedComponent;
}

// Preload admin chunks on hover/focus for better UX
export const preloadAdminChunks = () => {
  if (typeof window !== 'undefined') {
    // Preload user management
    import("@/components/admin/user-management").catch(() => {});
    
    // Preload template management
    import("@/components/admin/template-management").catch(() => {});
    
    // Preload analytics
    import("@/components/admin/comprehensive-analytics-dashboard").catch(() => {});
    import("@/components/admin/llm-analytics-dashboard").catch(() => {});
  }
};

// Admin route guard with lazy loading
export const AdminRouteGuard = dynamic(
  () => import("@/components/auth/role-guard").then((mod) => ({ default: mod.RoleGuard })),
  {
    loading: () => <AdminPageSkeleton />,
    ssr: false,
  }
) as ComponentType<{
  allowedRoles: ("DEVELOPER" | "ADMIN" | "RELAWAN")[];
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}>;
