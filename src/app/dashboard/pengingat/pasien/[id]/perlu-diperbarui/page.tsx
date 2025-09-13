"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Clock } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { toast } from "sonner";

interface PendingReminder {
  id: string;
  medicationName: string;
  scheduledTime: string;
  sentDate: string;
  customMessage?: string;
  status: "SENT" | "PENDING_UPDATE";
  // Automated confirmation fields
  confirmationStatus?: string;
  confirmationResponse?: string;
  confirmationResponseAt?: string;
  confirmationSentAt?: string;
}

export default function PendingUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPendingReminders(params.id as string);
    }
  }, [params.id]);

  const fetchPendingReminders = async (patientId: string) => {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/reminders/pending`
      );
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      } else {
        console.error("Failed to fetch pending reminders");
        setReminders([]);
      }
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
      setReminders([]);
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
            medicationTaken: taken,
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
        console.error("Failed to confirm reminder");
        toast.error("❌ Gagal Mengupdate", {
          description: "Tidak dapat menyimpan status pengingat. Coba lagi.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error confirming reminder:", error);
      toast.error("❌ Kesalahan Jaringan", {
        description:
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
        duration: 5000,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
                      <h3 className="font-semibold text-white mb-1">
                        {reminder.customMessage ||
                          `Minum obat ${reminder.medicationName}`}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {formatDate(reminder.sentDate)}
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
                              Response: "{reminder.confirmationResponse}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-white">
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
                    disabled={hasAutomatedConfirmation}
                    className={`flex-1 py-4 font-semibold transition-colors ${
                      hasAutomatedConfirmation
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                    }`}
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => handleConfirmation(reminder.id, false)}
                    disabled={hasAutomatedConfirmation}
                    className={`flex-1 py-4 font-semibold transition-colors ${
                      hasAutomatedConfirmation
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    }`}
                  >
                    Tidak
                  </button>
                </div>

                {/* Conflict Notice */}
                {hasAutomatedConfirmation && (
                  <div className="bg-yellow-50 border-t border-yellow-200 p-3">
                    <p className="text-xs text-yellow-700 text-center">
                      ⚠️ Sudah ada konfirmasi otomatis dari WhatsApp. Tidak
                      perlu konfirmasi manual.
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

        {/* Info Text */}
        {reminders.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Petunjuk:</strong> Tekan "Ya" jika pasien sudah minum obat
              setelah dikunjungi, atau "Tidak" jika pasien belum minum obat.
              Status ini akan membantu menghitung tingkat kepatuhan pasien.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
