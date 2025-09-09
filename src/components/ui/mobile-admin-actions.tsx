"use client";

import { useRouter, usePathname } from "next/navigation";
import { Shield, FileText, Calendar, Newspaper, Video, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from '@/lib/auth-utils'
// Role cache temporarily disabled

interface MobileAdminActionsProps {
  className?: string;
}

type UserRole = 'SUPERADMIN' | 'ADMIN' | 'MEMBER'

export function MobileAdminActions({ className = "" }: MobileAdminActionsProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser()
        setUserRole(user?.role as UserRole || null)
      } catch (error) {
        console.error('Failed to fetch user:', error)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className={`p-1.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0 ${className}`}>
        <Shield className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // Only show for SUPERADMIN users
  if (userRole !== "SUPERADMIN") {
    return null;
  }

  const isActive = pathname.startsWith("/dashboard/admin");

  return (
    <button
      onClick={() => router.push("/dashboard/admin")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-purple-100 text-purple-600"
            : "bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-600"
        }
        ${className}
      `}
      title="Superadmin Panel"
    >
      <Shield className="w-4 h-4" />
    </button>
  );
}

export function MobileCMSActions({ className = "" }: MobileAdminActionsProps) {
  // Temporarily simplified - role cache disabled
  const userRole = 'SUPERADMIN'
  const loading = false
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className={`p-1.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0 ${className}`}>
        <FileText className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // Show for both ADMIN and SUPERADMIN (consistent with desktop)
  if (!userRole || !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
    return null;
  }

  const isActive = pathname.startsWith("/dashboard/cms");

  return (
    <button
      onClick={() => router.push("/dashboard/cms")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-100 text-blue-600"
            : "bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
        }
        ${className}
      `}
      title="CMS - Content Management"
    >
      <FileText className="w-4 h-4" />
    </button>
  );
}

export function MobileReminderActions({ className = "" }: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/dashboard/pengingat");

  return (
    <button
      onClick={() => router.push("/dashboard/pengingat")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-600 text-white"
            : "bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white"
        }
        ${className}
      `}
      title="Pengingat Obat"
    >
      <Calendar className="w-4 h-4" />
    </button>
  );
}

export function MobileBeritaActions({ className = "" }: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/dashboard/berita");

  return (
    <button
      onClick={() => router.push("/dashboard/berita")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-green-600 text-white"
            : "bg-green-100 hover:bg-green-600 text-green-600 hover:text-white"
        }
        ${className}
      `}
      title="Berita & Artikel Kesehatan"
    >
      <Newspaper className="w-4 h-4" />
    </button>
  );
}

export function MobileVideoActions({ className = "" }: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/dashboard/video");

  return (
    <button
      onClick={() => router.push("/dashboard/video")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-red-600 text-white"
            : "bg-red-100 hover:bg-red-600 text-red-600 hover:text-white"
        }
        ${className}
      `}
      title="Video Edukasi Kesehatan"
    >
      <Video className="w-4 h-4" />
    </button>
  );
}

export function MobilePasienActions({ className = "" }: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/pasien");

  return (
    <button
      onClick={() => router.push("/dashboard")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-600 text-white"
            : "bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white"
        }
        ${className}
      `}
      title="Daftar Pasien"
    >
      <UserCheck className="w-4 h-4" />
    </button>
  );
}