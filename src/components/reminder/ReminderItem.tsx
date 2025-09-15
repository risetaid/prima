"use client";

import { Edit, Clock } from "lucide-react";

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

interface ReminderItemProps {
  reminder: ScheduledReminder;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (reminder: ScheduledReminder) => void;
  formatDate: (dateString: string) => string;
}

export function ReminderItem({
  reminder,
  isDeleteMode,
  isSelected,
  onToggleSelection,
  onEdit,
  formatDate,
}: ReminderItemProps) {
  return (
    <div className="flex items-center space-x-3">
      {isDeleteMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(reminder.id)}
          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-2 border-blue-300"
        />
      )}
      <div
        className={`flex-1 bg-blue-500 text-white rounded-2xl p-4 transition-all duration-200 ${
          isDeleteMode
            ? ""
            : "cursor-pointer hover:bg-blue-600 active:bg-blue-700 hover:shadow-lg"
        }`}
        onClick={() => onEdit(reminder)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
             <h3 className="font-semibold text-white mb-1">
               {reminder.customMessage || "Pengingat obat"}
             </h3>
            <p className="text-blue-100 text-sm">
              {formatDate(reminder.nextReminderDate)}
            </p>
            {!isDeleteMode && (
              <p className="text-blue-200 text-xs mt-2 flex items-center space-x-1">
                <Edit className="w-3 h-3" />
                <span>Ketuk untuk mengedit reminder</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-1 text-white">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{reminder.scheduledTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}