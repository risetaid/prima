"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { ContentSelector } from "./ContentSelector";
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
  medicationName: string;
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

export function EditReminderModal({
  isOpen,
  reminder,
  onClose,
  onSave,
  formatDate,
}: EditReminderModalProps) {
  const [editTime, setEditTime] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset state when modal opens with new reminder
  React.useEffect(() => {
    if (isOpen && reminder) {
      setEditTime(reminder.scheduledTime);
      setEditMessage(
        reminder.customMessage || `Minum obat ${reminder.medicationName}`
      );
      setSelectedContent(reminder.attachedContent || []);
      setIsUpdating(false);
    }
  }, [isOpen, reminder]);

  const handleSave = async () => {
    if (!editTime) {
      toast.error("Waktu pengingat tidak boleh kosong");
      return;
    }
    if (!editMessage.trim()) {
      toast.error("Pesan pengingat tidak boleh kosong");
      return;
    }

    setIsUpdating(true);
    try {
      await onSave(editTime, editMessage, selectedContent);
      onClose();
    } catch {
      // Error handling is done in the parent
    } finally {
      setIsUpdating(false);
    }
  };

  const getContentPrefix = (contentType: string): string => {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📚 Baca juga:";
      case "video":
        return "🎥 Tonton juga:";
      default:
        return "📖 Lihat juga:";
    }
  };

  const getContentIcon = (contentType: string): string => {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📄";
      case "video":
        return "🎥";
      default:
        return "📖";
    }
  };

  const generatePreviewMessage = (
    message: string,
    content: ContentItem[]
  ): string => {
    if (!content || content.length === 0) {
      return message;
    }

    let previewMessage = message;

    const contentByType: { [key: string]: ContentItem[] } = {};
    content.forEach((item) => {
      const type = item.type?.toLowerCase() || "other";
      if (!contentByType[type]) {
        contentByType[type] = [];
      }
      contentByType[type].push(item);
    });

    Object.keys(contentByType).forEach((contentType) => {
      const contents = contentByType[contentType];
      previewMessage += `\n\n${getContentPrefix(contentType)}`;

      contents.forEach((item) => {
        const icon = getContentIcon(item.type);
        previewMessage += `\n${icon} ${item.title}`;
        previewMessage += `\n   ${item.url}`;
      });
    });

    previewMessage += "\n\n💙 Tim PRIMA";

    return previewMessage;
  };

  if (!isOpen || !reminder) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Pengingat
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            disabled={isUpdating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Pengingat Saat Ini:
            </h4>
            <p className="font-medium text-gray-900">
              {reminder.customMessage ||
                `Minum obat ${reminder.medicationName}`}
            </p>
            <p className="text-sm text-gray-600">
              {formatDate(reminder.nextReminderDate)} -{" "}
              {reminder.scheduledTime}
            </p>
          </div>

          {/* Message Preview */}
          {(editMessage.trim() || selectedContent.length > 0) && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-700 mb-2">
                Pratinjau Pesan WhatsApp:
              </h4>
              <div className="bg-white p-3 rounded border text-sm text-gray-800 whitespace-pre-line max-h-32 overflow-y-auto">
                {generatePreviewMessage(
                  editMessage.trim() ||
                    `Minum obat ${reminder?.medicationName || "obat"}`,
                  selectedContent
                )}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Pesan ini akan dikirim ke pasien dengan konten yang dipilih
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pesan Pengingat
              </label>
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isUpdating}
                placeholder="Contoh: Jangan lupa minum obat candesartan pada waktu yang tepat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waktu Pengingat
              </label>
              <TimePicker24h
                value={editTime}
                onChange={setEditTime}
                placeholder="Pilih waktu pengingat"
                disabled={isUpdating}
                required
              />
            </div>

            {/* Content Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lampirkan Konten (Opsional)
              </label>
              <ContentSelector
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                maxSelection={5}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex space-x-3 p-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            disabled={isUpdating}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUpdating || !editTime || !editMessage.trim()}
          >
            {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}