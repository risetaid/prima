"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Loading components for admin pages
const AdminPageSkeleton = () => (
  <div className="text-center py-12">
    <p className="text-gray-500">Memuat...</p>
  </div>
);

const UserManagementSkeleton = () => (
  <div className="text-center py-12">
    <p className="text-gray-500">Memuat...</p>
  </div>
);

const TemplateManagementSkeleton = () => (
  <div className="text-center py-12">
    <p className="text-gray-500">Memuat...</p>
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
