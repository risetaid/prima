"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
}

interface ReminderStats {
  terjadwal: number;
  perluDiperbarui: number;
  selesai: number;
}

interface PatientReminderDashboardProps {
  patientName: string;
}

export function PatientReminderDashboard({
  patientName,
}: PatientReminderDashboardProps) {
  const router = useRouter();
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

  useEffect(() => {
    if (params.id) {
      fetchStats();
      fetchAllReminders();
    }
  }, [params.id]);

  const fetchStats = async () => {
    try {
      // Use the corrected /stats endpoint for badge counts
      const response = await fetch(`/api/patients/${params.id}/reminders/stats`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
      }
    } catch (error) {
    }
  };

  const fetchAllReminders = async () => {
    try {
      // Fetch data for display purposes only, stats come from separate endpoint
      const response = await fetch(`/api/patients/${params.id}/reminders/all`);

      if (response.ok) {
        const allData = await response.json();

        // Filter and categorize based on status from API
        const terjadwal = allData.filter(
          (item: any) => item.status === "scheduled"
        );
        const perlu = allData.filter((item: any) => item.status === "pending");
        const selesai = allData.filter(
          (item: any) =>
            item.status === "completed_taken" ||
            item.status === "completed_not_taken"
        );

        // Map to expected format with proper medicationTaken for completed items
        const mappedTerjadwal = terjadwal.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "scheduled",
        }));

        const mappedPerlu = perlu.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "pending",
        }));

        const mappedSelesai = selesai.map((item: any) => ({
          id: item.id,
          medicationName: item.medicationName || "Obat tidak diketahui",
          scheduledTime: item.scheduledTime || "--:--",
          reminderDate:
            item.reminderDate || new Date().toISOString().split("T")[0],
          customMessage: item.customMessage || "",
          status: "completed",
          medicationTaken: item.status === "completed_taken",
          confirmedAt: item.confirmedAt,
        }));

        setTerjadwalReminders(mappedTerjadwal);
        setPerluDiperbaruiReminders(mappedPerlu);
        setSelesaiReminders(mappedSelesai);

      } else {
        toast.error("Gagal memuat data pengingat");
      }
    } catch (error) {
      toast.error("Gagal memuat data pengingat");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = () => {
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
            scheduledTime: editFormData.time,
          }),
        }
      );

      if (response.ok) {
        toast.success("Pengingat berhasil diperbarui");
        await fetchStats();
        await fetchStats();
      await fetchAllReminders();
        setIsEditModalOpen(false);
        setEditingReminder(null);
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
        // Extract actual UUID from prefixed format (e.g., "pending-uuid" or "completed-uuid")
        const realId = reminderId.includes('-') && reminderId.split('-').length > 4
          ? reminderId.split('-').slice(1).join('-')
          : reminderId;
        
        const response = await fetch(`/api/reminders/scheduled/${realId}`, { 
          method: "DELETE" 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Delete failed for ${realId}`);
        }
        
        const result = await response.json();
        return result;
      });

      const results = await Promise.all(deletePromises);
      
      // Update local state immediately (like mobile does)
      setTerjadwalReminders(prev => prev.filter(r => !selectedReminders.includes(r.id)));
      setPerluDiperbaruiReminders(prev => prev.filter(r => !selectedReminders.includes(r.id)));
      setSelesaiReminders(prev => prev.filter(r => !selectedReminders.includes(r.id)));
      
      // Update stats immediately
      setStats(prev => ({
        ...prev,
        terjadwal: Math.max(0, prev.terjadwal - selectedReminders.length)
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
      // Extract actual UUID from prefixed format (e.g., "pending-uuid" or "completed-uuid")
      // Desktop /all endpoint returns IDs like "pending-732829dc-1b65-4c5b-91c9-0749cd287e95"
      // But API expects just the UUID: "732829dc-1b65-4c5b-91c9-0749cd287e95"
      const actualReminderId = reminderId.includes('-') && reminderId.split('-').length > 4
        ? reminderId.split('-').slice(1).join('-')
        : reminderId;

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

  const renderSelesaiCard = (reminder: Reminder) => (
    <div key={reminder.id} className="bg-white border rounded-lg p-4">
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
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Pengingat untuk {patientName}
          </h1>

          <button
            onClick={handleAddReminder}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Pengingat Baru</span>
          </button>
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
              selesaiReminders.map((reminder) => renderSelesaiCard(reminder))
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
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingReminder(null);
                }}
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

                {/* Time Field */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Jam
                  </label>
                  <input
                    type="time"
                    value={editFormData.time}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        time: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-4 p-6 border-t">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingReminder(null);
                }}
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