export interface ContentItem {
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

export interface Reminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  status: string;
  confirmationStatus?: string;
  sentAt?: string;
  confirmedAt?: string;
  attachedContent?: ContentItem[];
  manuallyConfirmed?: boolean;
}

export interface ReminderStats {
  terjadwal: number;
  perluDiperbarui: number;
  selesai: number;
}
