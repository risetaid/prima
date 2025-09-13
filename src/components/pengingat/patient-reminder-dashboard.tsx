"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Calendar,
  Download,
  CheckSquare,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";
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
  medicationName: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  status: string;
  medicationTaken?: boolean;
  sentAt?: string;
  confirmedAt?: string;
  attachedContent?: ContentItem[];
}

interface ReminderStats {
  terjadwal: number;
  perluDiperbarui: number;
  selesai: number;
}

interface PatientReminderDashboardProps {
  patientName: string;
  canAddReminders?: boolean;
}

export function PatientReminderDashboard({
  patientName,
  canAddReminders = true,
}: PatientReminderDashboardProps) {
  const params = useParams();
  const [terjadwalReminders, setTerjadwalReminders] = useState<Reminder[]>([]);
  const [perluDiperbaruiReminders, setPerluDiperbaruiReminders] = useState<
    Reminder[]
  >([]);
  const [selesaiReminders, setSelesaiReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ReminderStats>({
    terjadwal: 0,
    perluDiperbarui: 0,
    selesai: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editFormData, setEditFormData] = useState({ message: "", time: "" });
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);

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

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingReminder(null);
    setEditFormData({ message: "", time: "" });
    setSelectedContent([]);
  };

  useEffect(() => {
    if (params.id) {
      fetchStats();
      fetchAllReminders();
    }
  }, [params.id]);

  const fetchStats = async () => {
    try {
      // Use the corrected /stats endpoint for badge counts
      const response = await fetch(
        `/api/patients/${params.id}/reminders/stats`
      );
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
      }
    } catch (error) {}
  };

  const fetchScheduledReminders = async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/scheduled`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.nextReminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "scheduled",
          attachedContent: item.attachedContent || [],
        }));
        setTerjadwalReminders(mappedData);
      }
    } catch (error) {
      console.error("Error fetching scheduled reminders:", error);
    }
  };

  const fetchPendingReminders = async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/pending`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate: item.sentDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "pending",
        }));
        setPerluDiperbaruiReminders(mappedData);
      }
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
    }
  };

  const fetchCompletedReminders = async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/completed`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.completedDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "completed",
          medicationTaken: item.medicationTaken,
          confirmedAt: item.confirmedAt,
        }));
        setSelesaiReminders(mappedData);
      }
    } catch (error) {
      console.error("Error fetching completed reminders:", error);
    }
  };

  const fetchAllReminders = async () => {
    try {
      // Fetch data from separate endpoints for each section
      await Promise.all([
        fetchScheduledReminders(),
        fetchPendingReminders(),
        fetchCompletedReminders(),
      ]);
    } catch (error) {
      toast.error("Gagal memuat data pengingat");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = () => {
    if (!canAddReminders) {
      toast.error('Pasien belum terverifikasi', {
        description: 'Tambah pengingat dinonaktifkan sampai pasien menyetujui verifikasi WhatsApp.'
      })
      return
    }
    setIsAddModalOpen(true);
  };

  const handleModalSuccess = async () => {
    // Refresh both stats and data after successful reminder creation
    await fetchStats();
    await fetchAllReminders();
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditFormData({
      message: reminder.customMessage || reminder.medicationName || "",
      time: reminder.scheduledTime || "",
    });
    setSelectedContent(reminder.attachedContent || []);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReminder) return;

    try {
      const response = await fetch(
        `/api/reminders/scheduled/${editingReminder.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customMessage: editFormData.message,
            reminderTime: editFormData.time,
            attachedContent: selectedContent.map((content) => ({
              id: content.id,
              title: content.title,
              type: content.type.toUpperCase() as "ARTICLE" | "VIDEO",
            })),
          }),
        }
      );

      if (response.ok) {
        toast.success("Pengingat berhasil diperbarui");
        await fetchStats();
        await fetchAllReminders();
        setIsEditModalOpen(false);
        setEditingReminder(null);
        setSelectedContent([]);
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui pengingat");
      }
    } catch (error) {
      toast.error("Gagal memperbarui pengingat");
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedReminders([]);
  };

  const toggleReminderSelection = (reminderId: string) => {
    setSelectedReminders((prev) =>
      prev.includes(reminderId)
        ? prev.filter((id) => id !== reminderId)
        : [...prev, reminderId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedReminders.length === 0) {
      toast.warning("Pilih pengingat yang akan dihapus");
      return;
    }

    await performDelete();
  };

  const performDelete = async () => {
    try {
      const deletePromises = selectedReminders.map(async (reminderId) => {
        // The reminderId should already be a clean UUID
        const realId = reminderId;

        const response = await fetch(`/api/reminders/scheduled/${realId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Delete failed for ${realId}`);
        }

        const result = await response.json();
        return result;
      });

      await Promise.all(deletePromises);

      // Update local state immediately (like mobile does)
      setTerjadwalReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );
      setPerluDiperbaruiReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );
      setSelesaiReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );

      // Update stats immediately
      setStats((prev) => ({
        ...prev,
        terjadwal: Math.max(0, prev.terjadwal - selectedReminders.length),
      }));

      toast.success(`${selectedReminders.length} pengingat berhasil dihapus`);

      // Clear selected reminders immediately
      setSelectedReminders([]);
      setDeleteMode(false);

      // Optional: Refresh data in background for accuracy (but UI already updated)
      fetchStats().catch(console.error);
      fetchAllReminders().catch(console.error);
    } catch (error) {
      console.error("Error deleting reminders:", error);
      toast.error("Gagal menghapus pengingat");
    }
  };

  const handlePendingAction = async (
    reminderId: string,
    action: "ya" | "tidak"
  ) => {
    try {
      // The reminderId should already be a clean UUID from the /pending API
      // No extraction needed since /pending returns direct reminderLogs.id
      const actualReminderId = reminderId;

      const response = await fetch(
        `/api/patients/${params.id}/reminders/${actualReminderId}/confirm`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicationTaken: action === "ya",
            reminderLogId: actualReminderId,
          }),
        }
      );

      if (response.ok) {
        toast.success(
          `Konfirmasi "${action === "ya" ? "Ya" : "Tidak"}" berhasil disimpan`
        );
        await fetchStats();
        await fetchStats();
        await fetchAllReminders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save confirmation");
      }
    } catch (error) {
      toast.error("Gagal menyimpan konfirmasi");
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString || timeString === "null" || timeString === "undefined") {
      return "--:--";
    }
    return timeString;
  };

  const formatDate = (dateString?: string) => {
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
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const renderReminderCard = (
    reminder: Reminder,
    showCheckbox = false,
    showActions = false,
    allowEdit = false
  ) => (
    <div key={reminder.id} className="flex items-start space-x-3">
      {showCheckbox && (
        <div className="flex items-center pt-4">
          <input
            type="checkbox"
            checked={selectedReminders.includes(reminder.id)}
            onChange={() => toggleReminderSelection(reminder.id)}
            className="w-4 h-4 text-blue-600 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div
        className={`flex-1 bg-blue-600 text-white rounded-lg p-4 relative ${
          allowEdit && !showCheckbox && !showActions
            ? "cursor-pointer hover:bg-blue-700 transition-colors"
            : ""
        }`}
        onClick={() => {
          if (allowEdit && !showCheckbox && !showActions) {
            handleEditReminder(reminder);
          }
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">
              {reminder.customMessage ||
                reminder.medicationName ||
                "Pesan pengingat"}
            </h3>
            <p className="text-sm opacity-90">
              {formatDate(reminder.reminderDate)}
            </p>
          </div>
          <div className="flex items-center text-white/90">
            <Clock className="w-4 h-4 mr-1" />
            <span className="font-semibold">
              {formatTime(reminder.scheduledTime)}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePendingAction(reminder.id, "ya");
              }}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              Ya
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePendingAction(reminder.id, "tidak");
              }}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              Tidak
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSelesaiCard = (reminder: Reminder, index: number) => (
    <div
      key={`${reminder.id}-${reminder.status}-${index}`}
      className="bg-white border rounded-lg p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">
            {reminder.customMessage ||
              reminder.medicationName ||
              "Pesan pengingat"}
          </h3>
          <p className="text-sm text-gray-600">
            {formatDate(reminder.reminderDate)}
          </p>
          {reminder.confirmedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Dikonfirmasi: {formatDate(reminder.confirmedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span className="font-semibold">
            {formatTime(reminder.scheduledTime)}
          </span>
        </div>
      </div>

      <div className="mt-3">
        {reminder.medicationTaken === true ? (
          <div className="bg-green-500 text-white py-2 px-4 rounded text-center font-medium">
            Dipatuhi
          </div>
        ) : reminder.medicationTaken === false ? (
          <div className="bg-red-500 text-white py-2 px-4 rounded text-center font-medium">
            Tidak Dipatuhi
          </div>
        ) : (
          <div className="bg-gray-500 text-white py-2 px-4 rounded text-center font-medium">
            Status tidak diketahui
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pengingat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Pengingat untuk {patientName}
            </h1>

            <button
              onClick={handleAddReminder}
              disabled={!canAddReminders}
              className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                canAddReminders
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Pengingat Baru</span>
            </button>
            {!canAddReminders && (
              <p className="text-xs text-gray-500 mt-1">Pasien belum terverifikasi. Kirim verifikasi dan tunggu balasan "YA".</p>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Column 1: Terjadwal */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <button
              onClick={toggleDeleteMode}
              className={`p-1 hover:bg-white/20 rounded cursor-pointer transition-colors ${
                deleteMode ? "bg-white/20" : ""
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <h2 className="font-semibold">Terjadwal</h2>
              <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
                {isNaN(stats.terjadwal) ? 0 : stats.terjadwal}
              </span>
            </div>
            <div className="flex items-center space-x-2"></div>
          </div>

          <div className="p-4 space-y-3">
            {terjadwalReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Tidak ada pengingat terjadwal
              </p>
            ) : (
              terjadwalReminders.map((reminder) =>
                renderReminderCard(reminder, deleteMode, false, true)
              )
            )}
          </div>

          {deleteMode && selectedReminders.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <button
                onClick={handleDeleteSelected}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors font-medium cursor-pointer"
              >
                Hapus {selectedReminders?.length || 0} Pengingat
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Perlu Diperbarui */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-center space-x-1">
            <Download className="w-5 h-5" />
            <h2 className="font-semibold">Perlu Diperbarui</h2>
            <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
              {isNaN(stats.perluDiperbarui) ? 0 : stats.perluDiperbarui}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {perluDiperbaruiReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Tidak ada pengingat yang perlu diperbarui
              </p>
            ) : (
              perluDiperbaruiReminders.map((reminder) =>
                renderReminderCard(reminder, false, true)
              )
            )}
          </div>
        </div>

        {/* Column 3: Selesai */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5" />
              <h2 className="font-semibold">Selesai</h2>
              <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
                {isNaN(stats.selesai) ? 0 : stats.selesai}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {selesaiReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Tidak ada pengingat selesai
              </p>
            ) : (
              selesaiReminders.map((reminder, index) =>
                renderSelesaiCard(reminder, index)
              )
            )}
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      <AddReminderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
        patientName={patientName}
      />

      {/* Edit Reminder Modal */}
      {isEditModalOpen && editingReminder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Pengingat
              </h3>
              <button
                onClick={closeEditModal}
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
                      setEditFormData((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
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
                        editFormData.message.trim() ||
                          `Minum obat ${
                            editingReminder?.medicationName || "obat"
                          }`,
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
                      setEditFormData((prev) => ({
                        ...prev,
                        time: time,
                      }))
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
                    onContentChange={setSelectedContent}
                    maxSelection={5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-4 p-6 border-t">
              <button
                onClick={closeEditModal}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
