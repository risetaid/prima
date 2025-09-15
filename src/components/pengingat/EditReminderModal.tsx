import { X } from "lucide-react";
import { ContentSelector } from "@/components/reminder/ContentSelector";
import { TimePicker24h } from "@/components/ui/time-picker-24h";

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

interface Reminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  status: string;
  medicationTaken?: boolean;
  sentAt?: string;
  confirmedAt?: string;
  attachedContent?: ContentItem[];
}

interface EditReminderModalProps {
  isOpen: boolean;
  editingReminder: Reminder | null;
  editFormData: { message: string; time: string };
  selectedContent: ContentItem[];
  onClose: () => void;
  onSave: () => void;
  onFormDataChange: (data: { message: string; time: string }) => void;
  onContentChange: (content: ContentItem[]) => void;
}

// Helper function to get dynamic content prefix based on content type
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

// Helper function to get content icon based on content type
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

// Generate preview message with dynamic content prefixes
const generatePreviewMessage = (
  message: string,
  content: ContentItem[]
): string => {
  if (!content || content.length === 0) {
    return message;
  }

  let previewMessage = message;

  // Group content by type for better organization
  const contentByType: { [key: string]: ContentItem[] } = {};
  content.forEach((item) => {
    const type = item.type?.toLowerCase() || "other";
    if (!contentByType[type]) {
      contentByType[type] = [];
    }
    contentByType[type].push(item);
  });

  // Add content sections
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

export function EditReminderModal({
  isOpen,
  editingReminder,
  editFormData,
  selectedContent,
  onClose,
  onSave,
  onFormDataChange,
  onContentChange,
}: EditReminderModalProps) {
  if (!isOpen || !editingReminder) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Pengingat
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Message Field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Pesan
              </label>
              <textarea
                value={editFormData.message}
                onChange={(e) =>
                  onFormDataChange({
                    ...editFormData,
                    message: e.target.value,
                  })
                }
                placeholder="Masukkan pesan pengingat..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Message Preview */}
            {(editFormData.message.trim() ||
              selectedContent.length > 0) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-700 mb-2">
                  Pratinjau Pesan WhatsApp:
                </h4>
                <div className="bg-white p-3 rounded border text-sm text-gray-800 whitespace-pre-line max-h-40 overflow-y-auto">
                  {generatePreviewMessage(
                    editFormData.message.trim() || "Pengingat obat",
                    selectedContent
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Pesan ini akan dikirim ke pasien dengan konten yang
                  dipilih
                </p>
              </div>
            )}

            {/* Time Field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Jam
              </label>
              <TimePicker24h
                value={editFormData.time}
                onChange={(time) =>
                  onFormDataChange({
                    ...editFormData,
                    time: time,
                  })
                }
                placeholder="Pilih jam pengingat"
              />
            </div>

            {/* Content Selector */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Lampirkan Konten (Opsional)
              </label>
              <ContentSelector
                selectedContent={selectedContent}
                onContentChange={onContentChange}
                maxSelection={5}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex space-x-4 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}