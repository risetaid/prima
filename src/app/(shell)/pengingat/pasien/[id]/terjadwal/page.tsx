"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "@/components/ui/toast";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ReminderItem } from "@/components/reminder/ReminderItem";
import { EditScheduledReminderModal } from "@/components/reminder/EditScheduledReminderModal";
import { FloatingActionButtons } from "@/components/reminder/FloatingActionButtons";

import { logger } from '@/lib/logger';
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

export default function ScheduledRemindersPage() {
  const router = useRouter();
  const params = useParams();
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] =
    useState<ScheduledReminder | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });



  useEffect(() => {
    if (params.id) {
      fetchScheduledReminders(params.id as string);
    }
  }, [params.id]);

  const fetchScheduledReminders = async (patientId: string) => {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=scheduled`
      );
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Unwrap createApiHandler response
        logger.info('📅 Scheduled reminders response:', { success: result.success, hasData: !!result.data, count: Array.isArray(data) ? data.length : 'not-array' });
        const normalized = Array.isArray(data) ? data : [];
        setReminders(normalized);
      } else {
        logger.error("Failed to fetch scheduled reminders");
        setReminders([]);
      }
    } catch (error: unknown) {
      logger.error("Error fetching scheduled reminders:", error instanceof Error ? error : new Error(String(error)));
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminderSelection = (reminderId: string) => {
    setSelectedReminders((prev) =>
      prev.includes(reminderId)
        ? prev.filter((id) => id !== reminderId)
        : [...prev, reminderId]
    );
  };

  const handleDeleteReminders = async () => {
    if (selectedReminders.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Hapus Pengingat",
      description: `Apakah Anda yakin ingin menghapus ${selectedReminders.length} pengingat? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/patients/${params.id}/reminders/scheduled`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reminderIds: selectedReminders }),
            }
          );

          if (response.ok) {
            // Remove from local state after successful API call
            setReminders((prev) =>
              prev.filter((r) => !selectedReminders.includes(r.id))
            );
            setSelectedReminders([]);
            setIsDeleteMode(false);

            // Invalidate cache and refresh parent stats
            await fetch(
              `/api/patients/${params.id}/reminders/stats?invalidate=true`
            );

            toast.success("Pengingat berhasil dihapus", {
              description: `${selectedReminders.length} pengingat telah dihapus`,
            });
          } else {
            const error = await response.json();
            toast.error("Gagal menghapus pengingat", {
              description: error.error || "Terjadi kesalahan pada server",
            });
          }
        } catch (error: unknown) {
          logger.error("Error deleting reminders:", error instanceof Error ? error : new Error(String(error)));
          toast.error("Gagal menghapus pengingat", {
            description: "Terjadi kesalahan jaringan",
          });
        }
      },
    });
  };

  const openEditModal = (reminder: ScheduledReminder) => {
    if (isDeleteMode) return; // Don't open modal in delete mode
    setSelectedReminder(reminder);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedReminder(null);
  };

  const handleEditReminder = async (time: string, message: string, content: ContentItem[]) => {
    if (!selectedReminder) return;

    try {
      // Update existing reminder with new time and message only
      const response = await fetch(
        `/api/reminders/scheduled/${selectedReminder.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reminderTime: time,
            customMessage: message,
            attachedContent: content.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type.toUpperCase() as "ARTICLE" | "VIDEO",
              slug: item.slug,
            })),
          }),
        }
      );

      if (response.ok) {
        toast.success("Pengingat berhasil diperbarui");
        // Refresh the reminders
        if (params.id) {
          fetchScheduledReminders(params.id as string);
        }
      } else {
        const error = await response.json();
        toast.error("Gagal memperbarui pengingat", {
          description: error.error || "Terjadi kesalahan pada server",
        });
      }
    } catch (error: unknown) {
      logger.error("Error updating reminder:", error instanceof Error ? error : new Error(String(error)));
      toast.error("Gagal memperbarui pengingat", {
        description: "Terjadi kesalahan jaringan",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "null" || dateString === "undefined") {
      return "Tanggal tidak tersedia";
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Tanggal tidak valid";
    }

    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Pengingat Terjadwal
            </h1>
            <UserButton />
          </div>
        </header>

        {/* Main Content with Skeleton */}
        <main className="px-4 py-6">
          <TableSkeleton rows={5} columns={3} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
      />
      {/* Header */}
      <header className="bg-white">
        <div className="flex justify-between items-center px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-blue-600" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Terjadwal</h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isDeleteMode={isDeleteMode}
              isSelected={selectedReminders.includes(reminder.id)}
              onToggleSelection={toggleReminderSelection}
              onEdit={openEditModal}
              formatDate={formatDate}
            />
          ))}

          {reminders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada pengingat terjadwal</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        isDeleteMode={isDeleteMode}
        selectedCount={selectedReminders.length}
        totalCount={reminders.length}
        onToggleDeleteMode={() => setIsDeleteMode(true)}
        onDeleteSelected={handleDeleteReminders}
        onCancelDelete={() => {
          setIsDeleteMode(false);
          setSelectedReminders([]);
        }}
      />

      {/* Edit Modal */}
      <EditScheduledReminderModal
        isOpen={isEditModalOpen}
        reminder={selectedReminder}
        onClose={closeEditModal}
        onSave={handleEditReminder}
        formatDate={formatDate}
      />
    </div>
  );
}
