"use client";

import { useUser } from "@stackframe/stack";
import { useRouter, usePathname } from "next/navigation";
import { UserMenu } from "@/components/ui/user-menu";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Shield, Bug } from "lucide-react";

interface DesktopHeaderProps {
  showNavigation?: boolean;
}

function AdminActions() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      } else if (response.status === 401 || response.status === 403) {
        // User not authenticated or not approved - don't show admin buttons
        setUserRole(null);
      } else {
        console.error("Error fetching user role:", response.status);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  };

  if (userRole !== "ADMIN") {
    return null;
  }

  return (
    <>
      {/* Admin Panel */}
      <button
        onClick={() => router.push("/dashboard/admin/users")}
        className={`
          px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2
          ${
            pathname.startsWith("/dashboard/admin")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
          }
        `}
        title="Admin Panel"
      >
        <Shield className="w-4 h-4" />
        <span>Admin</span>
      </button>

      {/* Debug Webhook */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={() => router.push("/debug-webhook")}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2
            ${
              pathname.startsWith("/debug-webhook")
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:text-orange-600 hover:bg-gray-50"
            }
          `}
          title="Debug Webhook"
        >
          <Bug className="w-4 h-4" />
          <span>Debug</span>
        </button>
      )}
    </>
  );
}

export function DesktopHeader({ showNavigation = true }: DesktopHeaderProps) {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Beranda", href: "/", active: pathname === "/" },
    {
      label: "Pasien",
      href: "/dashboard",
      active:
        pathname === "/dashboard" || pathname.startsWith("/dashboard/pasien"),
    },
    {
      label: "Berita",
      href: "/dashboard/cms?type=articles",
      active:
        pathname.startsWith("/dashboard/cms") && pathname.includes("articles"),
    },
    {
      label: "Video Edukasi",
      href: "/dashboard/cms?type=videos",
      active:
        pathname.startsWith("/dashboard/cms") && pathname.includes("videos"),
    },
  ];

  const handleNavigation = (href: string) => {
    // For CMS routes that don't exist yet, show coming soon
    if (href.includes("/dashboard/cms")) {
      toast.info("Fitur ini akan segera hadir!", {
        description:
          "CMS untuk berita dan video edukasi sedang dalam pengembangan",
      });
      return;
    }

    // If user not authenticated and trying to access dashboard, redirect to signin
    if (!user && href.startsWith("/dashboard")) {
      router.push("/handler/signin");
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
              {navItems.map((item) => (
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
              ))}

              {/* Admin Actions - Only visible to admins */}
              <AdminActions />

              {/* Special Pengingat Button */}
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
            </nav>
          )}

          {/* User Menu or Sign In */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => router.push("/handler/signin")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
