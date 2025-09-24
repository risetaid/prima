"use client";

import { Calendar, Newspaper, Video } from "lucide-react";

interface MobileNavigationButtonsProps {
  onPengingatClick: () => void;
  onBeritaClick: () => void;
  onVideoClick: () => void;
}

export function MobileNavigationButtons({
  onPengingatClick,
  onBeritaClick,
  onVideoClick,
}: MobileNavigationButtonsProps) {
  return (
    <div className="lg:hidden bg-blue-500 px-6 py-8">
      <div className="flex space-x-6 justify-center pb-4">
        {/* Pengingat */}
        <div className="text-center flex-shrink-0 min-w-[80px]">
          <div
            onClick={onPengingatClick}
            className="cursor-pointer hover:scale-105 transition-transform mb-3"
          >
            <Calendar className="w-8 h-8 mx-auto text-white" />
          </div>
          <h3 className="font-semibold text-sm text-white">Pengingat</h3>
        </div>

        {/* Berita */}
        <div className="text-center flex-shrink-0 min-w-[80px]">
          <div
            onClick={onBeritaClick}
            className="cursor-pointer hover:scale-105 transition-transform mb-3"
          >
            <Newspaper className="w-8 h-8 mx-auto text-white" />
          </div>
          <h3 className="font-semibold text-sm text-white">Berita</h3>
        </div>

        {/* Video Edukasi */}
        <div className="text-center flex-shrink-0 min-w-[80px]">
          <div
            onClick={onVideoClick}
            className="cursor-pointer hover:scale-105 transition-transform mb-3"
          >
            <Video className="w-8 h-8 mx-auto text-white" />
          </div>
          <h3 className="font-semibold text-sm text-white">Video Edukasi</h3>
        </div>
      </div>
    </div>
  );
}
