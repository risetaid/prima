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
  medicationName?: string;
  scheduledTime?: string;
  nextReminderDate?: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface PendingReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  sentDate?: string;
  customMessage?: string;
}

interface CompletedReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  completedDate?: string;
  customMessage?: string;
  medicationTaken?: boolean;
  confirmedAt?: string;
}

interface ScheduledReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  nextReminderDate?: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface PendingReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  sentDate?: string;
  customMessage?: string;
}

interface CompletedReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  completedDate?: string;
  customMessage?: string;
  medicationTaken?: boolean;
  confirmedAt?: string;
}

interface ScheduledReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  nextReminderDate?: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
}

interface PendingReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  sentDate?: string;
  customMessage?: string;
}

interface CompletedReminderApi {
  id: string;
  medicationName?: string;
  scheduledTime?: string;
  completedDate?: string;
  customMessage?: string;
  medicationTaken?: boolean;
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/stats`
      );
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch {}
  }, [params.id]);

  const fetchScheduledReminders = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/scheduled`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: ScheduledReminderApi) => ({
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
  }, [params.id]);

  const fetchPendingReminders = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/pending`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: PendingReminderApi) => ({
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
  }, [params.id]);

  const fetchCompletedReminders = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/reminders/completed`
      );
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: CompletedReminderApi) => ({
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
  }, [params.id]);

  const fetchAllReminders = useCallback(async () => {
    try {
      await Promise.all([
        fetchScheduledReminders(),
        fetchPendingReminders(),
        fetchCompletedReminders(),
      ]);
    } catch {
      toast.error("Gagal memuat data pengingat");
    } finally {
      setLoading(false);
    }
  }, [fetchScheduledReminders, fetchPendingReminders, fetchCompletedReminders]);

  useEffect(() => {
    if (params.id) {
      fetchStats();
      fetchAllReminders();
    }
  }, [params.id, fetchStats, fetchAllReminders]);

  // Refresh stats periodically to catch cron updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (params.id) {
        fetchStats();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [params.id, fetchStats]);









  const handleAddReminder = () => {
    setIsAddModalOpen(true);
  };

  const handleModalSuccess = async () => {
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
            medicationTaken: action === "ya",
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
