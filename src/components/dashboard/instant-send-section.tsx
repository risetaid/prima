"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstantSendSectionProps {
  userRole: string | null;
  onOpenDialog: () => void;
}

export function InstantSendSection({ userRole, onOpenDialog }: InstantSendSectionProps) {
  if (!userRole) return null;

  return (
    <div className="px-4 lg:px-8 mt-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-400">
        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Kirim Semua Pengingat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Kirim pesan pengingat ke semua pasien yang Anda kelola secara instan
            </p>
          </div>
          <Button
            onClick={onOpenDialog}
            variant="destructive"
            size="lg"
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Kirim Semua
          </Button>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="text-center">
            <h3 className="text-base font-medium text-gray-900">Kirim Semua Pengingat</h3>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Kirim pesan ke semua pasien Anda secara instan
            </p>
            <Button
              onClick={onOpenDialog}
              variant="destructive"
              size="default"
              className="flex items-center gap-2 w-full justify-center"
            >
              <Send className="w-4 h-4" />
              Kirim Semua Pengingat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}