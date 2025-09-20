"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";
import { PatientReminderHeader } from "@/components/pengingat/PatientReminderHeader";
import { ReminderColumn } from "@/components/pengingat/ReminderColumn";
import { EditReminderModal } from "@/components/pengingat/EditReminderModal";
import type { Reminder, ReminderStats, ContentItem } from "@/components/pengingat/types";

interface ScheduledReminderApi {
  id: string;
  scheduledTime?: string;
  nextReminderDate?: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface PendingReminderApi {
  id: string;
  scheduledTime?: string;
  sentDate?: string;
  customMessage?: string;
}

interface CompletedReminderApi {
  id: string;
  scheduledTime?: string;
  completedDate?: string;
  customMessage?: string;
  confirmationStatus?: string;
  confirmedAt?: string;
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
        const statsData = await response.json();
        setStats(statsData);
      } else {
        console.error("Stats API error:", response.status, response.statusText);
        toast.error("Gagal memuat statistik pengingat");
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Gagal memuat statistik pengingat");
    }
  }, [patientId]);

  const fetchScheduledReminders = useCallback(async () => {
    if (!patientId) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/scheduled`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("Scheduled reminders data:", data);
        const mappedData = data.map((item: ScheduledReminderApi) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.nextReminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "scheduled",
          attachedContent: item.attachedContent || [],
        }));
        setTerjadwalReminders(mappedData);
      } else {
        console.error("Scheduled reminders API error:", response.status, response.statusText);
        toast.error("Gagal memuat pengingat terjadwal");
      }
    } catch (error) {
      console.error("Error fetching scheduled reminders:", error);
      toast.error("Gagal memuat pengingat terjadwal");
    }
  }, [patientId]);

  const fetchPendingReminders = useCallback(async () => {
    if (!patientId) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/pending`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("Pending reminders data:", data);
        const mappedData = data.map((item: PendingReminderApi) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate: item.sentDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "pending",
        }));
        setPerluDiperbaruiReminders(mappedData);
      } else {
        console.error("Pending reminders API error:", response.status, response.statusText);
        toast.error("Gagal memuat pengingat perlu diperbarui");
      }
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
      toast.error("Gagal memuat pengingat perlu diperbarui");
    }
  }, [patientId]);

  const fetchCompletedReminders = useCallback(async () => {
    if (!patientId) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/completed`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("Completed reminders data:", data);
        const mappedData = data.map((item: CompletedReminderApi) => ({
          id: item.id,
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.completedDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "completed",
          confirmationStatus: item.confirmationStatus,
          confirmedAt: item.confirmedAt,
        }));
        setSelesaiReminders(mappedData);
      } else {
        console.error("Completed reminders API error:", response.status, response.statusText);
        toast.error("Gagal memuat pengingat selesai");
      }
    } catch (error) {
      console.error("Error fetching completed reminders:", error);
      toast.error("Gagal memuat pengingat selesai");
    }
  }, [patientId]);

  const fetchAllReminders = useCallback(async (retryCount = 0) => {
    try {
      console.log("Fetching all reminders for patient:", patientId);
      await Promise.all([
        fetchScheduledReminders(),
        fetchPendingReminders(),
        fetchCompletedReminders(),
      ]);
      console.log("All reminders fetched successfully");
    } catch (error) {
      console.error("Error fetching all reminders:", error);

      // Only retry once for network errors, then fail gracefully
      if (retryCount === 0) {
        console.log("Retrying fetch once...");
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
  }, [fetchScheduledReminders, fetchPendingReminders, fetchCompletedReminders, patientId]);

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

    console.log("Data consistency check:", { stats, actualCounts });

    // Warn if counts don't match (within tolerance of 1 for timing issues)
    const tolerance = 1;
    if (Math.abs(stats.terjadwal - actualCounts.terjadwal) > tolerance ||
        Math.abs(stats.perluDiperbarui - actualCounts.perluDiperbarui) > tolerance ||
        Math.abs(stats.selesai - actualCounts.selesai) > tolerance) {
      console.warn("Reminder counts don't match stats:", { stats, actualCounts });

      // Only show toast for significant discrepancies
      if (Math.abs(stats.perluDiperbarui - actualCounts.perluDiperbarui) > 2) {
        toast.warning("Jumlah pengingat perlu diperbarui tidak akurat. Silakan refresh halaman.");
      }
    }
  }, [stats, terjadwalReminders.length, perluDiperbaruiReminders.length, selesaiReminders.length, loading]);

  // Remove periodic stats refresh to prevent infinite API calls
  // Stats will be refreshed manually via the refresh button or when actions are performed









  const handleAddReminder = () => {
    setIsAddModalOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchAllReminders(),
      ]);
      toast.success("Data berhasil diperbarui");
    } catch (error) {
      console.error("Error refreshing data:", error);
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
      const response = await fetch(
        `/api/patients/${params.id}/reminders/${reminderId}/confirm`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmationStatus: action === "ya" ? "CONFIRMED" : "NOT_CONFIRMED",
            reminderLogId: reminderId,
          }),
        }
      );

      if (response.ok) {
        toast.success(
          `Konfirmasi "${action === "ya" ? "Ya" : "Tidak"}" berhasil disimpan`
        );
        await fetchStats();
        await fetchAllReminders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save confirmation");
      }
    } catch {
      toast.error("Gagal menyimpan konfirmasi");
    }
  };

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

      <EditReminderModal
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
