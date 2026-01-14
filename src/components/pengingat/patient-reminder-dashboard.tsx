"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";
import { PatientReminderHeader } from "@/components/pengingat/PatientReminderHeader";
import { ReminderColumn } from "@/components/pengingat/ReminderColumn";
import { EditQuickReminderModal } from "@/components/pengingat/EditQuickReminderModal";
import type {
  Reminder,
  ReminderStats,
  ContentItem,
} from "@/components/pengingat/types";
import { logger } from "@/lib/logger";
import { sanitizeForAudit } from "@/lib/phi-mask";

interface ScheduledReminderResponse {
  id: string;
  scheduledTime?: string;
  reminderDate?: string;
  nextReminderDate?: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface PendingReminderResponse {
  id: string;
  scheduledTime?: string;
  reminderDate?: string;
  customMessage?: string;
  status?: string;
  confirmationStatus?: string;
  confirmationResponse?: string;
  confirmationResponseAt?: string;
  confirmationSentAt?: string;
  manuallyConfirmed?: boolean;
}

interface CompletedReminderResponse {
  id: string;
  scheduledTime?: string;
  reminderDate?: string;
  customMessage?: string;
  confirmationStatus?: string;
  confirmedAt?: string;
  manuallyConfirmed?: boolean;
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
  const patientId = params.id as string;
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!patientId) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/stats`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        const statsData = result.data || result; // Unwrap createApiHandler response
        logger.info("📊 Dashboard stats response:", {
          success: result.success,
          hasData: !!result.data,
          stats: statsData,
          rawResult: result,
        });
        setStats(statsData);
      } else {
        logger.error("Stats API error", undefined, {
          statusCode: response.status,
          statusText: response.statusText,
        });
        toast.error("Gagal memuat statistik pengingat");
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching stats:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal memuat statistik pengingat");
    }
  }, [patientId]);

  const fetchScheduledReminders = useCallback(async () => {
    if (!patientId) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=scheduled&page=1&limit=100`,
        { signal: controller.signal }
      );

      if (response.ok) {
        const result = await response.json();

        // Handle nested response structure: { success: true, data: { data: [...], pagination: {...} } }
        const responseData = result.data?.data || result.data || [];
        const dataArray = Array.isArray(responseData) ? responseData : [];

        logger.info("Scheduled reminders data:", {
          success: result.success,
          hasData: !!result.data,
          hasNestedData: !!result.data?.data,
          dataType: typeof responseData,
          isArray: Array.isArray(responseData),
          count: dataArray.length,
          total: result.data?.pagination?.total || result.pagination?.total,
        });

        const mappedData = dataArray.map((item: ScheduledReminderResponse) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate ||
            item.nextReminderDate ||
            new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "scheduled",
          attachedContent: item.attachedContent || [],
        }));
        setTerjadwalReminders(mappedData);
      } else {
        logger.error("Scheduled reminders API error", undefined, {
          statusCode: response.status,
          statusText: response.statusText,
        });
        toast.error("Gagal memuat pengingat terjadwal");
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching scheduled reminders:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal memuat pengingat terjadwal");
    } finally {
      clearTimeout(timeoutId);
    }
  }, [patientId]);

  const fetchPendingReminders = useCallback(async () => {
    if (!patientId) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=pending&page=1&limit=100`,
        { signal: controller.signal }
      );

      if (response.ok) {
        const result = await response.json();

        // Handle nested response structure: { success: true, data: { data: [...], pagination: {...} } }
        const responseData = result.data?.data || result.data || [];
        const dataArray = Array.isArray(responseData) ? responseData : [];

        logger.info("Pending reminders data:", {
          success: result.success,
          hasData: !!result.data,
          hasNestedData: !!result.data?.data,
          dataType: typeof responseData,
          isArray: Array.isArray(responseData),
          count: dataArray.length,
          total: result.data?.pagination?.total || result.pagination?.total,
          sampleData: dataArray.slice(0, 2).map((item) => ({
            id: item.id,
            hasReminderDate: !!item.reminderDate,
            hasScheduledTime: !!item.scheduledTime,
            hasCustomMessage: !!item.customMessage,
            confirmationStatus: item.confirmationStatus,
          })),
        });

        const mappedData = dataArray.map((item: PendingReminderResponse) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "pending",
          confirmationStatus: item.confirmationStatus,
          confirmationResponse: item.confirmationResponse,
          confirmationResponseAt: item.confirmationResponseAt,
          confirmationSentAt: item.confirmationSentAt,
          manuallyConfirmed: Boolean(item.manuallyConfirmed),
        }));
        setPerluDiperbaruiReminders(mappedData);
      } else {
        logger.error("Pending reminders API error", undefined, {
          statusCode: response.status,
          statusText: response.statusText,
        });
        toast.error("Gagal memuat pengingat perlu diperbarui");
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching pending reminders:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal memuat pengingat perlu diperbarui");
    } finally {
      clearTimeout(timeoutId);
    }
  }, [patientId]);

  const fetchCompletedReminders = useCallback(async () => {
    if (!patientId) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=completed&page=1&limit=100`,
        { signal: controller.signal }
      );

      if (response.ok) {
        const result = await response.json();

        // Handle nested response structure: { success: true, data: { data: [...], pagination: {...} } }
        const responseData = result.data?.data || result.data || [];
        const dataArray = Array.isArray(responseData) ? responseData : [];

        logger.info("Completed reminders data:", {
          success: result.success,
          hasData: !!result.data,
          hasNestedData: !!result.data?.data,
          dataType: typeof responseData,
          isArray: Array.isArray(responseData),
          count: dataArray.length,
          total: result.data?.pagination?.total || result.pagination?.total,
        });

        const mappedData = dataArray.map((item: CompletedReminderResponse) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "completed",
          confirmationStatus: item.confirmationStatus,
          confirmedAt: item.confirmedAt,
          manuallyConfirmed: Boolean(
            (item as { manuallyConfirmed?: boolean }).manuallyConfirmed
          ),
        }));
        setSelesaiReminders(mappedData);
      } else {
        logger.error("Completed reminders API error", undefined, {
          statusCode: response.status,
          statusText: response.statusText,
        });
        toast.error("Gagal memuat pengingat selesai");
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching completed reminders:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal memuat pengingat selesai");
    } finally {
      clearTimeout(timeoutId);
    }
  }, [patientId]);

  const fetchAllReminders = useCallback(
    async (retryCount = 0) => {
      try {
        logger.info("Fetching all reminders for patient", sanitizeForAudit({ patientId }));
        await Promise.all([
          fetchScheduledReminders(),
          fetchPendingReminders(),
          fetchCompletedReminders(),
        ]);
        logger.info("All reminders fetched successfully");
      } catch (error: unknown) {
        logger.error(
          "Error fetching all reminders:",
          error instanceof Error ? error : new Error(String(error))
        );

        // Only retry once for network errors, then fail gracefully
        if (retryCount === 0) {
          logger.info("Retrying fetch once...");
          setTimeout(() => {
            fetchAllReminders(1);
          }, 1000);
        } else {
          // Show error toast but don't keep retrying
          toast.error("Gagal memuat data pengingat. Silakan refresh halaman.");
        }
      } finally {
        if (retryCount === 0) {
          setLoading(false);
        }
      }
    },
    [
      fetchScheduledReminders,
      fetchPendingReminders,
      fetchCompletedReminders,
      patientId,
    ]
  );

  useEffect(() => {
    if (patientId) {
      fetchStats();
      fetchAllReminders();
    }
  }, [patientId, fetchStats, fetchAllReminders]);

  // Validate data consistency after reminders are loaded
  useEffect(() => {
    if (loading) return; // Don't validate while loading

    const actualCounts = {
      terjadwal: terjadwalReminders.length,
      perluDiperbarui: perluDiperbaruiReminders.length,
      selesai: selesaiReminders.length,
    };

    logger.info("Data consistency check", { stats, actualCounts });

    // Warn if counts don't match (within tolerance of 1 for timing issues)
    const tolerance = 1;
    if (
      Math.abs(stats.terjadwal - actualCounts.terjadwal) > tolerance ||
      Math.abs(stats.perluDiperbarui - actualCounts.perluDiperbarui) >
        tolerance ||
      Math.abs(stats.selesai - actualCounts.selesai) > tolerance
    ) {
      logger.warn("Reminder counts don't match stats", { stats, actualCounts });

      // Only show toast for significant discrepancies
      if (Math.abs(stats.perluDiperbarui - actualCounts.perluDiperbarui) > 2) {
        toast.warning(
          "Jumlah pengingat perlu diperbarui tidak akurat. Silakan refresh halaman."
        );
      }
    }
  }, [
    stats,
    terjadwalReminders.length,
    perluDiperbaruiReminders.length,
    selesaiReminders.length,
    loading,
  ]);

  // Remove periodic stats refresh to prevent infinite API calls
  // Stats will be refreshed manually via the refresh button or when actions are performed

  const handleAddReminder = () => {
    setIsAddModalOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchStats(), fetchAllReminders()]);
      toast.success("Data berhasil diperbarui");
    } catch (error: unknown) {
      logger.error(
        "Error refreshing data:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal memperbarui data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleModalSuccess = async () => {
    await fetchStats();
    await fetchAllReminders();
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditFormData({
      message: reminder.customMessage || "",
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
        closeEditModal();
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui pengingat");
      }
    } catch {
      toast.error("Gagal memperbarui pengingat");
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingReminder(null);
    setEditFormData({ message: "", time: "" });
    setSelectedContent([]);
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

  const handlePendingAction = async (
    reminderId: string,
    action: "ya" | "tidak"
  ) => {
    try {
      // Convert "ya"/"tidak" to boolean
      const confirmed = action === "ya";

      // API call to update reminder status - reminderId here is actually ReminderLog ID
      const response = await fetch(
        `/api/patients/${patientId}/reminders/${reminderId}/confirm`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmed: confirmed,
            reminderLogId: reminderId, // Pass the ReminderLog ID
          }),
        }
      );

      if (response.ok) {
        // Refresh data to update the table cards
        await fetchAllReminders();
        await fetchStats();

        // Show success toast message
        if (confirmed) {
          toast.success("✅ Konfirmasi Berhasil", {
            description: "Pasien sudah minum obat sesuai jadwal",
            duration: 4000,
          });
        } else {
          toast.warning("⚠️ Konfirmasi Berhasil", {
            description: "Pasien belum minum obat - akan dipantau lebih lanjut",
            duration: 4000,
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error("Failed to confirm reminder:", errorData);
        toast.error("❌ Gagal Mengupdate", {
          description:
            errorData.error ||
            "Tidak dapat menyimpan status pengingat. Coba lagi.",
          duration: 5000,
        });
      }
    } catch (error: unknown) {
      logger.error(
        "Error confirming reminder:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("❌ Kesalahan Jaringan", {
        description:
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
        duration: 5000,
      });
    }
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
        const response = await fetch(`/api/reminders/scheduled/${reminderId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Delete failed for ${reminderId}`);
        }

        return await response.json();
      });

      await Promise.all(deletePromises);

      setTerjadwalReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );
      setPerluDiperbaruiReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );
      setSelesaiReminders((prev) =>
        prev.filter((r) => !selectedReminders.includes(r.id))
      );

      setStats((prev) => ({
        ...prev,
        terjadwal: Math.max(0, prev.terjadwal - selectedReminders.length),
      }));

      toast.success(`${selectedReminders.length} pengingat berhasil dihapus`);

      setSelectedReminders([]);
      setDeleteMode(false);

      fetchStats().catch(logger.error);
      fetchAllReminders().catch(logger.error);
    } catch (error: unknown) {
      logger.error(
        "Error deleting reminders:",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("Gagal menghapus pengingat");
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="px-4 lg:px-8">
      <PatientReminderHeader
        patientName={patientName}
        canAddReminders={canAddReminders}
        onAddReminder={handleAddReminder}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <ReminderColumn
          type="scheduled"
          reminders={terjadwalReminders}
          count={stats.terjadwal}
          deleteMode={deleteMode}
          selectedReminders={selectedReminders}
          onToggleDeleteMode={toggleDeleteMode}
          onToggleReminderSelection={toggleReminderSelection}
          onDeleteSelected={handleDeleteSelected}
          onEditReminder={handleEditReminder}
        />

        <ReminderColumn
          type="pending"
          reminders={perluDiperbaruiReminders}
          count={stats.perluDiperbarui}
          onPendingAction={handlePendingAction}
        />

        <ReminderColumn
          type="completed"
          reminders={selesaiReminders}
          count={stats.selesai}
        />
      </div>

      <AddReminderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
        patientName={patientName}
      />

      <EditQuickReminderModal
        isOpen={isEditModalOpen}
        editingReminder={editingReminder}
        editFormData={editFormData}
        selectedContent={selectedContent}
        onClose={closeEditModal}
        onSave={handleSaveEdit}
        onFormDataChange={setEditFormData}
        onContentChange={setSelectedContent}
      />
    </div>
  );
}
