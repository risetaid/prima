"use client";

import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { useAuthContext } from "@/lib/auth-context";
// Role cache temporarily disabled

interface DesktopHeaderProps {
  showNavigation?: boolean;
}

function AdminActions() {
  const { role: userRole, isLoaded } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Don't render anything during SSR to prevent hydration mismatch
  if (!isHydrated || !isLoaded) {
    return null;
  }

  if (userRole !== "DEVELOPER") {
    return null;
  }

  return (
    <>
      {/* Admin Panel - Main Entry Point */}
      <button
        onClick={() => router.push("/dashboard/admin")}
        className={`
          px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2
          ${
            pathname.startsWith("/dashboard/admin")
              ? "bg-purple-100 text-purple-700"
              : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
          }
        `}
        title="Admin Panel"
      >
        <Shield className="w-4 h-4" />
        <span>Admin Panel</span>
      </button>
    </>
  );
}

export function DesktopHeader({ showNavigation = true }: DesktopHeaderProps) {
  const { user, role: userRole } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent hydration mismatch by only rendering dynamic content after hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Base navigation for all authenticated users
  const baseNavItems = [
    { label: "Beranda", href: "/", active: pathname === "/" },
  ];

  // Role-specific navigation items
  const getRoleBasedNavItems = () => {
    if (!user) return baseNavItems;

    // RELAWAN users see: Beranda, Pengingat, Berita, Video Edukasi
    if (userRole === "RELAWAN") {
      return [
        ...baseNavItems,
        {
          label: "Berita",
          href: "/dashboard/berita",
          active: pathname.startsWith("/dashboard/berita"),
        },
        {
          label: "Video Edukasi",
          href: "/dashboard/video",
          active: pathname.startsWith("/dashboard/video"),
        },
      ];
    }

    // ADMIN and DEVELOPER see all navigation including patient management
    return [
      ...baseNavItems,
      {
        label: "Pasien",
        href: "/dashboard",
        active:
          pathname === "/dashboard" || pathname.startsWith("/dashboard/pasien"),
      },
      {
        label: "Berita",
        href: "/dashboard/berita",
        active: pathname.startsWith("/dashboard/berita"),
      },
      {
        label: "Video Edukasi",
        href: "/dashboard/video",
        active: pathname.startsWith("/dashboard/video"),
      },
    ];
  };

  const roleBasedNavItems = getRoleBasedNavItems();

  // Add CMS navigation only for ADMIN and DEVELOPER
  const navItems = [
    ...roleBasedNavItems,
    ...(userRole && ["ADMIN", "DEVELOPER"].includes(userRole)
      ? [
          {
            label: "CMS",
            href: "/dashboard/cms",
            active: pathname.startsWith("/dashboard/cms"),
          },
        ]
      : []),
  ];

  const handleNavigation = (href: string) => {
    // If user not authenticated and trying to access dashboard, redirect to signin
    if (!user && href.startsWith("/dashboard")) {
      router.push("/sign-in");
      return;
    }

    router.push(href);
  };

  return (
    <header className="bg-white shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center px-4 lg:px-8 py-4">
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

          {/* Desktop Navigation */}
          {showNavigation && (
            <nav className="hidden lg:flex items-center space-x-8">
              {isHydrated ? (
                navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                    ${
                      item.active
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }
                  `}
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                // Show skeleton/placeholder during SSR
                <div className="flex items-center space-x-8">
                  <div className="px-3 py-2 rounded-md text-sm font-medium text-gray-600">
                    Beranda
                  </div>
                </div>
              )}

              {/* Admin Actions - Only visible to admins */}
              <AdminActions />

              {/* Special Pengingat Button - Prominent button for all users */}
              {isHydrated && user && (
                <button
                  onClick={() => handleNavigation("/dashboard/pengingat")}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer
                    ${
                      pathname.startsWith("/dashboard/pengingat")
                        ? "bg-blue-700 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }
                  `}
                >
                  🗓️ Pengingat
                </button>
              )}
            </nav>
          )}

          {/* User Menu or Sign In */}
          <div className="flex items-center space-x-4">
            {isHydrated ? (
              user ? (
                <UserButton afterSignOutUrl="/sign-in" />
              ) : (
                <button
                  onClick={() => router.push("/sign-in")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )
            ) : (
              // Show skeleton during SSR
              <div className="bg-gray-200 text-transparent px-4 py-2 rounded-lg font-medium">
                Masuk
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
