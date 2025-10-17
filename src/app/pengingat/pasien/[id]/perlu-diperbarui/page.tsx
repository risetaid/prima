"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
interface PendingReminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  status: "SENT" | "PENDING_UPDATE";
  // Automated confirmation fields
  confirmationStatus?: string;
  confirmationResponse?: string;
  confirmationResponseAt?: string;
  confirmationSentAt?: string;
  manuallyConfirmed?: boolean;
}

interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function PendingUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchPendingReminders(params.id as string, currentPage);
    }
  }, [params.id, currentPage]);

  const fetchPendingReminders = async (patientId: string, page: number) => {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=pending&page=${page}&limit=10`
      );
      if (response.ok) {
        const result = await response.json();

        // Response structure: { success: true, data: { data: [...], pagination: {...} } }
        logger.info("⏰ Pending reminders raw response:", {
          patientId,
          hasData: !!result.data,
          hasPagination: !!result.pagination,
        });

        // Handle apiSuccess wrapped response: { success: true, data: { data: [...], pagination: {...} } }
        if (
          result.data &&
          result.data.data &&
          result.data.pagination &&
          Array.isArray(result.data.data)
        ) {
          logger.info("⏰ Pending reminders response (paginated):", {
            page,
            operation: "fetch-pending",
          });
          const normalized = result.data.data.map((item: PendingReminder) => ({
            ...item,
            manuallyConfirmed: Boolean(item.manuallyConfirmed),
          }));
          setReminders(normalized);
          setPagination(result.data.pagination);
          return;
        }

        // Handle direct paginated format { data: [...], pagination: {...} }
        if (result.data && result.pagination && Array.isArray(result.data)) {
          logger.info("⏰ Pending reminders response (direct paginated):", {
            page,
            operation: "fetch-pending",
          });
          const normalized = result.data.map((item: PendingReminder) => ({
            ...item,
            manuallyConfirmed: Boolean(item.manuallyConfirmed),
          }));
          setReminders(normalized);
          setPagination(result.pagination);
          return;
        }

        // If neither format matches, log error
        logger.error(
          "Invalid response format for pending reminders",
          new Error("Validation failed"),
          {
            patientId,
            operation: "fetch-pending",
          }
        );
        setReminders([]);
        setPagination(null);
      } else {
        logger.error(
          "Failed to fetch pending reminders",
          new Error(`HTTP ${response.status}`),
          {
            patientId,
            operation: "fetch-pending",
          }
        );
        setReminders([]);
        setPagination(null);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching pending reminders:",
        error instanceof Error ? error : new Error(String(error)),
        { patientId, operation: "fetch-pending" }
      );
      setReminders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (reminderId: string, taken: boolean) => {
    try {
      // API call to update reminder status - reminderId here is actually ReminderLog ID
      const response = await fetch(
        `/api/patients/${params.id}/reminders/${reminderId}/confirm`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmed: taken,
            reminderLogId: reminderId, // Pass the ReminderLog ID
          }),
        }
      );

      if (response.ok) {
        // Remove from pending list since it's now confirmed
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));

        // Show success toast message
        if (taken) {
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
        logger.error("Failed to confirm reminder");
        toast.error("❌ Gagal Mengupdate", {
          description: "Tidak dapat menyimpan status pengingat. Coba lagi.",
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

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.hasPreviousPage) {
      setCurrentPage(currentPage - 1);
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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
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
      <main className="px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Download className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">
            Perlu Diperbarui
          </h2>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.map((reminder) => {
            const hasAutomatedConfirmation = Boolean(
              reminder.confirmationStatus &&
                reminder.confirmationStatus !== "PENDING"
            );
            const isManuallyConfirmed = Boolean(reminder.manuallyConfirmed);
            const isLocked = hasAutomatedConfirmation || isManuallyConfirmed;
            const automatedStatusText = hasAutomatedConfirmation
              ? reminder.confirmationStatus === "CONFIRMED"
                ? "Sudah Dikonfirmasi (Otomatis)"
                : reminder.confirmationStatus === "MISSED"
                ? "Belum Minum (Otomatis)"
                : "Status Otomatis: " + reminder.confirmationStatus
              : null;

            return (
              <div
                key={reminder.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200"
              >
                {/* Main Card */}
                <div className="bg-white text-gray-900 p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {reminder.customMessage || `Minum obat`}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {formatDate(reminder.reminderDate)}
                      </p>
                      {/* Automated Confirmation Status */}
                      {hasAutomatedConfirmation && (
                        <div className="mt-2 flex items-center space-x-2">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.confirmationStatus === "CONFIRMED"
                                ? "bg-green-500/20 text-green-100 border border-green-400/30"
                                : reminder.confirmationStatus === "MISSED"
                                ? "bg-red-500/20 text-red-100 border border-red-400/30"
                                : "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30"
                            }`}
                          >
                            🤖 {automatedStatusText}
                          </div>
                          {reminder.confirmationResponse && (
                            <span className="text-xs text-blue-200">
                              Response: &quot;{reminder.confirmationResponse}
                              &quot;
                            </span>
                          )}
                        </div>
                      )}
                      {isManuallyConfirmed && (
                        <div className="mt-2">
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 border border-green-400/30">
                            ✅ Sudah Dikonfirmasi (Manual)
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">
                        {reminder.scheduledTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex">
                  <button
                    onClick={() => handleConfirmation(reminder.id, true)}
                    disabled={isLocked}
                    className={`flex-1 py-4 font-semibold transition-colors ${
                      isLocked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                    }`}
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => handleConfirmation(reminder.id, false)}
                    disabled={isLocked}
                    className={`flex-1 py-4 font-semibold transition-colors ${
                      isLocked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    }`}
                  >
                    Tidak
                  </button>
                </div>

                {/* Conflict Notice */}
                {(hasAutomatedConfirmation || isManuallyConfirmed) && (
                  <div className="bg-yellow-50 border-t border-yellow-200 p-3">
                    <p className="text-xs text-yellow-700 text-center">
                      ⚠️ Sudah ada konfirmasi untuk pengingat ini. Tidak perlu
                      konfirmasi manual.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {reminders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Tidak ada pengingat yang perlu diperbarui
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.total > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={!pagination.hasPreviousPage || loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.hasPreviousPage && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-sm font-medium text-gray-700">
              Halaman {pagination.page} dari {pagination.totalPages}
            </div>

            <button
              onClick={handleNextPage}
              disabled={!pagination.hasNextPage || loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.hasNextPage && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Info Text */}
        {reminders.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Petunjuk:</strong> Tekan &quot;Ya&quot; jika pasien sudah
              minum obat setelah dikunjungi, atau &quot;Tidak&quot; jika pasien
              belum minum obat. Status ini akan membantu menghitung tingkat
              kepatuhan pasien.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
