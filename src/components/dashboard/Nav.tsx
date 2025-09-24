"use client";

import { Calendar, Newspaper, Video } from "lucide-react";
import { useDashboardNavigation } from "@/hooks/useDashboardNavigation";

export type Variant = "mobile" | "desktop";

interface NavProps {
  variant: Variant;
}

export function Nav({ variant }: NavProps) {
  const { onPengingatClick, onBeritaClick, onVideoClick } =
    useDashboardNavigation();

  if (variant === "desktop") {
    return (
      <div className="hidden lg:flex space-x-8 px-8 py-4 bg-blue-600 text-white">
        <button
          onClick={onPengingatClick}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Pengingat"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Pengingat</span>
        </button>
        <button
          onClick={onBeritaClick}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Berita"
        >
          <Newspaper className="w-5 h-5" />
          <span className="font-medium">Berita</span>
        </button>
        <button
          onClick={onVideoClick}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Video Edukasi"
        >
          <Video className="w-5 h-5" />
          <span className="font-medium">Video Edukasi</span>
        </button>
      </div>
    );
  }

  // Mobile variant - enhanced styling from page.tsx
  return (
    <div className="lg:hidden bg-blue-500 px-6 py-8">
      <div className="flex items-center justify-center space-x-8 pb-4">
        {/* Pengingat */}
        <div className="flex flex-col items-center">
          <button
            onClick={onPengingatClick}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-300 mb-3 border-2 border-blue-200 shadow-md"
            aria-label="Pengingat"
          >
            <Calendar className="w-8 h-8 text-blue-600" />
          </button>
          <h3 className="font-semibold text-sm text-white text-center leading-tight">
            Pengingat
          </h3>
        </div>

        {/* Berita */}
        <div className="flex flex-col items-center">
          <button
            onClick={onBeritaClick}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-300 mb-3 border-2 border-emerald-200 shadow-md"
            aria-label="Berita"
          >
            <Newspaper className="w-8 h-8 text-emerald-600" />
          </button>
          <h3 className="font-semibold text-sm text-white text-center leading-tight">
            Berita
          </h3>
        </div>

        {/* Video Edukasi */}
        <div className="flex flex-col items-center">
          <button
            onClick={onVideoClick}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-300 mb-3 border-2 border-red-200 shadow-md"
            aria-label="Video Edukasi"
          >
            <Video className="w-8 h-8 text-red-600" />
          </button>
          <h3 className="font-semibold text-sm text-white text-center leading-tight">
            Video Edukasi
          </h3>
        </div>
      </div>
    </div>
  );
}
