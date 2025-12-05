"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Clock, ChevronUp } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { logger } from "@/lib/logger";
interface ReminderData {
  id: string;
  manuallyConfirmed?: boolean;
  confirmationStatus?: string;
  status?: string;
  category?: "selesai" | "perluDiperbarui" | "terjadwal";
  scheduledTime?: string;
  reminderDate?: string;
  message?: string;
  sentAt?: string | Date;
  startDate?: string | Date;
  [key: string]: unknown;
}

interface AllReminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  message?: string;
  category: "selesai" | "perluDiperbarui" | "terjadwal";
  confirmationStatus?: "CONFIRMED" | "MISSED" | "PENDING";
  manuallyConfirmed?: boolean;
}

export default function AllRemindersPage() {
  const router = useRouter();
  const params = useParams();
  const [reminders, setReminders] = useState<AllReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchAllReminders(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling 100vh (approximately 100% of viewport height)
      const scrolledDistance = window.scrollY;
      const viewportHeight = window.innerHeight;
      setShowBackToTop(scrolledDistance > viewportHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const fetchAllReminders = async (patientId: string) => {
    try {
      // Fetch all reminders with the new consolidated endpoint
      const allResponse = await fetch(
        `/api/patients/${patientId}/reminders?filter=all`
      );
      const allResult = allResponse.ok
        ? await allResponse.json()
        : { success: false, data: { reminders: [] } };

      // Unwrap createApiHandler response and extract reminders array
      const allData = allResult.data || allResult;
      const remindersData = allData.reminders || [];

      logger.info("📋 All reminders response:", {
        success: allResult.success,
        hasData: !!allResult.data,
        remindersCount: Array.isArray(remindersData)
          ? remindersData.length
          : "not-array",
      });

      // Use the category field from API directly - no client-side re-computation needed
      const allReminders = remindersData.map((reminder: ReminderData) => {
        const rawDate =
          reminder.reminderDate ||
          reminder.sentAt ||
          reminder.startDate ||
          null;

        const normalizedDate = (() => {
          if (!rawDate) return "";
          if (typeof rawDate === "string") {
            return rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
          }
          if (rawDate instanceof Date) {
            return rawDate.toISOString().split("T")[0];
          }
          return "";
        })();

        return {
          id: reminder.id,
          scheduledTime: reminder.scheduledTime || "00:00",
          message: reminder.message,
          category: reminder.category || "terjadwal", // Use API-provided category
          confirmationStatus: reminder.confirmationStatus as AllReminder["confirmationStatus"],
          manuallyConfirmed: Boolean(reminder.manuallyConfirmed),
          reminderDate: normalizedDate,
        } as AllReminder;
      });

      setReminders(allReminders);
    } catch (error: unknown) {
      logger.error(
        "Error fetching all reminders:",
        error instanceof Error ? error : new Error(String(error))
      );
      setReminders([]);
    } finally {
      setLoading(false);
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

  const getCardStyle = (category: string) => {
    switch (category) {
      case "terjadwal":
        return "bg-blue-500 text-white";
      case "perluDiperbarui":
        return "bg-orange-500 text-white";
      case "selesai":
        return "bg-green-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10">
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
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Semua</h2>
        </div>

        {/* Grouped Reminders List */}
        <div className="space-y-8">
          {/* 1. Terjadwal Section */}
          {(() => {
            const scheduledReminders = reminders.filter(
              (r) => r.category === "terjadwal"
            );
            return (
              scheduledReminders.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Terjadwal ({scheduledReminders.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {scheduledReminders.map((reminder, index) => (
                      <div
                        key={`${reminder.id}-${reminder.category}-${index}`}
                        className={`${getCardStyle(
                          reminder.category
                        )} rounded-2xl p-4`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {reminder.message || `Minum obat`}
                            </h3>
                            <p className="text-sm opacity-90">
                              {formatDate(reminder.reminderDate)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">
                              {reminder.scheduledTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            );
          })()}

          {/* 2. Perlu Diperbarui Section */}
          {(() => {
            const pendingReminders = reminders.filter(
              (r) => r.category === "perluDiperbarui"
            );
            return (
              pendingReminders.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Perlu Diperbarui ({pendingReminders.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pendingReminders.map((reminder, index) => (
                      <div
                        key={`${reminder.id}-${reminder.category}-${index}`}
                        className="space-y-2"
                      >
                        <div className="flex justify-start">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Perlu Update
                          </span>
                        </div>
                        <div
                          className={`${getCardStyle(
                            reminder.category
                          )} rounded-2xl p-4`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">
                                {reminder.message || `Minum obat`}
                              </h3>
                              <p className="text-sm opacity-90">
                                {formatDate(reminder.reminderDate)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">
                                {reminder.scheduledTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            );
          })()}

          {/* 3. Selesai Section */}
          {(() => {
            const completedReminders = reminders.filter(
              (r) => r.category === "selesai"
            );
            return (
              completedReminders.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Selesai ({completedReminders.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {completedReminders.map((reminder, index) => (
                      <div
                        key={`${reminder.id}-${reminder.category}-${index}`}
                        className="space-y-2"
                      >
                        <div className="flex justify-start">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Dipatuhi
                          </span>
                        </div>
                        <div
                          className={`${getCardStyle(
                            reminder.category
                          )} rounded-2xl p-4`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">
                                {reminder.message || `Minum obat`}
                              </h3>
                              <p className="text-sm opacity-90">
                                {formatDate(reminder.reminderDate)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">
                                {reminder.scheduledTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            );
          })()}

          {/* Empty State */}
          {reminders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada pengingat</p>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        {reminders.length > 0 && (
          <div className="mt-8 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Ringkasan</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {reminders.filter((r) => r.category === "terjadwal").length}
                </div>
                <div className="text-sm text-gray-600">Terjadwal</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {reminders.filter((r) => r.category === "perluDiperbarui").length}
                </div>
                <div className="text-sm text-gray-600">Perlu Update</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {reminders.filter((r) => r.category === "selesai").length}
                </div>
                <div className="text-sm text-gray-600">Selesai</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Back to Top Button - Mobile Only */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 md:hidden bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Back to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
