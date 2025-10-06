"use client";

import React, { useState } from "react";
import { X, Info } from "lucide-react";
import { ContentSelector } from "@/components/reminder/ContentSelector";
import { TimePicker24h } from "@/components/ui/time-picker-24h";
import { toast } from "@/components/ui/toast";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  type: "article" | "video";
  thumbnailUrl?: string;
  url: string;
  excerpt?: string;
  videoUrl?: string;
  durationMinutes?: string;
  order?: number;
}

interface ScheduledReminder {
  id: string;
  scheduledTime: string;
  nextReminderDate: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface EditReminderModalProps {
  isOpen: boolean;
  reminder: ScheduledReminder | null;
  onClose: () => void;
  onSave: (time: string, message: string, content: ContentItem[]) => Promise<void>;
  formatDate: (dateString: string) => string;
}

export function EditScheduledReminderModal({
  isOpen,
  reminder,
  onClose,
  onSave,
  formatDate,
}: EditReminderModalProps) {
  const [selectedTime, setSelectedTime] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (reminder) {
      setSelectedTime(reminder.scheduledTime);
      setCustomMessage(reminder.customMessage || "");
      setSelectedContent(reminder.attachedContent || []);
    }
  }, [reminder]);

  const handleSave = async () => {
    if (!selectedTime) {
      toast.error("Validasi Gagal", {
        description: "Waktu pengingat harus diisi",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedTime, customMessage, selectedContent);
      toast.success("Berhasil", {
        description: "Pengingat berhasil diperbarui",
      });
      onClose();
    } catch (error) {
      toast.error("Gagal", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {reminder ? "Edit Pengingat" : "Tambah Pengingat"}
            </h2>
            <p className="text-sm text-gray-600">
              {reminder && formatDate(reminder.nextReminderDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waktu Pengingat *
            </label>
            <TimePicker24h
              value={selectedTime}
              onChange={setSelectedTime}
              className="w-full"
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Isi Pesan
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tulis pesan pengingat di sini..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Contoh: &ldquo;Jangan lupa minum air putih 8 gelas sehari&rdquo;
            </p>
          </div>

          {/* Content Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lampiran Konten (Opsional)
            </label>
            <ContentSelector
              selectedContent={selectedContent}
              onContentChange={setSelectedContent}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tambahkan artikel atau video terkait kesehatan
            </p>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Informasi</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Pengingat akan dikirim melalui WhatsApp ke pasien pada waktu yang telah ditentukan.
                  Pesan dapat disesuaikan sesuai kebutuhan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}