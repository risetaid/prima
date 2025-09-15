"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Shield,
  FileText,
  Calendar,
  Newspaper,
  Video,
  UserCheck,
} from "lucide-react";
import { useAuthContext } from "@/lib/auth-context";
// Role cache temporarily disabled

interface MobileAdminActionsProps {
  className?: string;
}

export function MobileAdminActions({
  className = "",
}: MobileAdminActionsProps) {
  const { role: userRole, isLoaded } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  if (!isLoaded || !userRole) {
    return (
      <div
        className={`p-1.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0 ${className}`}
      >
        <Shield className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // Only show for DEVELOPER users
  if (userRole !== "DEVELOPER") {
    return null;
  }

  const isActive = pathname.startsWith("/admin");

  return (
    <button
      onClick={() => router.push("/admin")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-purple-100 text-purple-700"
            : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="Admin Panel"
    >
      <Shield className="w-4 h-4" />
    </button>
  );
}

export function MobileCMSActions({ className = "" }: MobileAdminActionsProps) {
  const { role: userRole, isLoaded } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div
        className={`p-1.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0 ${className}`}
      >
        <FileText className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // Show for both ADMIN and DEVELOPER (consistent with desktop)
  if (!userRole || !["ADMIN", "DEVELOPER"].includes(userRole)) {
    return null;
  }

  const isActive = pathname.startsWith("/cms");

  return (
    <button
      onClick={() => router.push("/cms")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="CMS - Content Management"
    >
      <FileText className="w-4 h-4" />
    </button>
  );
}

export function MobileReminderActions({
  className = "",
}: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/pengingat");

  return (
    <button
      onClick={() => router.push("/pengingat")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-700 text-white"
            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="Pengingat Obat"
    >
      <Calendar className="w-4 h-4" />
    </button>
  );
}

export function MobileBeritaActions({
  className = "",
}: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/berita");

  return (
    <button
      onClick={() => router.push("/berita")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-green-600 text-white"
            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="Berita & Artikel Kesehatan"
    >
      <Newspaper className="w-4 h-4" />
    </button>
  );
}

export function MobileVideoActions({
  className = "",
}: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname.startsWith("/video-edukasi");

  return (
    <button
      onClick={() => router.push("/video-edukasi")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-red-600 text-white"
            : "text-gray-600 hover:text-red-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="Video Edukasi Kesehatan"
    >
      <Video className="w-4 h-4" />
    </button>
  );
}

export function MobilePasienActions({
  className = "",
}: MobileAdminActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive =
    pathname === "/pasien" || pathname.startsWith("/pasien");

  return (
    <button
      onClick={() => router.push("/pasien")}
      className={`
        p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation
        ${
          isActive
            ? "bg-blue-700 text-white"
            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
        }
        ${className}
      `}
      title="Daftar Pasien"
    >
      <UserCheck className="w-4 h-4" />
    </button>
  );
}
