"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  text?: string;
  variant?: "default" | "simple";
}

export function BackButton({
  className,
  text = "Kembali",
  variant = "default",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // First try to go back if there's meaningful history
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;

      // If we came from within the same site and have history, go back
      if (
        referrer &&
        referrer.startsWith(currentOrigin) &&
        window.history.length > 1
      ) {
        router.back();
        return;
      }

      // Fallback: navigate to appropriate parent page based on current path
      const currentPath = window.location.pathname;

      if (currentPath.startsWith("/content/videos/")) {
        // For video pages, go to home (since we don't have a videos listing page)
        router.push("/");
      } else if (currentPath.startsWith("/content/articles/")) {
        // For article pages, go to home (since we don't have an articles listing page)
        router.push("/");
      } else if (currentPath.startsWith("/cms/")) {
        // For CMS pages, go to CMS dashboard
        router.push("/cms");
      } else if (currentPath.startsWith("/pasien/") || currentPath.startsWith("/pengingat/") || currentPath.startsWith("/berita/") || currentPath.startsWith("/video-edukasi/") || currentPath.startsWith("/admin/")) {
        // For protected pages, go to pasien home
        router.push("/pasien");
      } else {
        // Default fallback to home
        router.push("/");
      }
    }
  };

  if (variant === "simple") {
    return (
      <button
        onClick={handleBack}
        className={cn(
          "cursor-pointer flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors",
          className
        )}
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">{text}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleBack}
      className={cn(
        "cursor-pointer flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors",
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="font-medium">{text}</span>
    </button>
  );
}

