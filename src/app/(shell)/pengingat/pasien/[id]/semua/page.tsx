"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Clock } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { logger } from '@/lib/logger';
interface ReminderData {
  id: string;
  manuallyConfirmed?: boolean;
  confirmationStatus?: string;
  status?: string;
  [key: string]: unknown;
}

interface AllReminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  message?: string;
  customMessage?: string;
  status: "scheduled" | "pending" | "completed_taken" | "completed_not_taken";
  confirmationStatus?: "CONFIRMED" | "MISSED" | "PENDING";
  manuallyConfirmed?: boolean;
  originalStatus?: string;
}





export default function AllRemindersPage() {
  const router = useRouter();
  const params = useParams();
  const [reminders, setReminders] = useState<AllReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchAllReminders(params.id as string);
    }
  }, [params.id]);

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

      logger.info('📋 All reminders response:', {
        success: allResult.success,
        hasData: !!allResult.data,
        remindersCount: Array.isArray(remindersData) ? remindersData.length : 'not-array'
      });

      const allReminders = remindersData.map((reminder: ReminderData) => {
        const manuallyConfirmed = Boolean(reminder.manuallyConfirmed);
        const confirmationStatus = reminder.confirmationStatus as AllReminder["confirmationStatus"] | undefined;
        const status = reminder.status as string | undefined;

        let mappedStatus: AllReminder["status"] = "scheduled";

        if (confirmationStatus === 'CONFIRMED' || manuallyConfirmed) {
          mappedStatus = "completed_taken";
        } else if (confirmationStatus === 'MISSED') {
          mappedStatus = "completed_not_taken";
        } else if (status && ['SENT', 'DELIVERED'].includes(status) && !manuallyConfirmed) {
          mappedStatus = "pending";
        } else if (status && ['PENDING', 'FAILED'].includes(status)) {
          mappedStatus = "scheduled";
        }

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
          ...reminder,
          status: mappedStatus,
          confirmationStatus,
          manuallyConfirmed,
          originalStatus: status,
          reminderDate: normalizedDate,
        } as AllReminder;
      });

      setReminders(allReminders);
    } catch (error: unknown) {
      logger.error("Error fetching all reminders:", error instanceof Error ? error : new Error(String(error)));
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

  const getCardStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500 text-white";
      case "pending":
        return "bg-orange-500 text-white";
      case "completed_taken":
        return "bg-green-500 text-white";
      case "completed_not_taken":
        return "bg-red-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return { text: "Terjadwal", color: "bg-blue-100 text-blue-800" };
      case "pending":
        return { text: "Perlu Update", color: "bg-orange-100 text-orange-800" };
      case "completed_taken":
        return { text: "Dipatuhi", color: "bg-green-100 text-green-800" };
      case "completed_not_taken":
        return { text: "Tidak Dipatuhi", color: "bg-red-100 text-red-800" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
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
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Semua</h2>
        </div>

        {/* Grouped Reminders List */}
        <div className="space-y-8">
          {/* 1. Terjadwal Section */}
          {(() => {
            const scheduledReminders = reminders.filter(
              (r) => r.status === "scheduled"
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
                        key={`${reminder.id}-${reminder.status}-${index}`}
                        className={`${getCardStyle(
                          reminder.status
                        )} rounded-2xl p-4`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {reminder.message || reminder.customMessage ||
                                `Minum obat`}
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
              (r) => r.status === "pending"
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
                        key={`${reminder.id}-${reminder.status}-${index}`}
                        className="space-y-2"
                      >
                        <div className="flex justify-start">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Perlu Update
                          </span>
                        </div>
                        <div
                          className={`${getCardStyle(
                            reminder.status
                          )} rounded-2xl p-4`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">
                                {reminder.message || reminder.customMessage ||
                                  `Minum obat`}
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
              (r) =>
                r.status === "completed_taken" ||
                r.status === "completed_not_taken"
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
                    {completedReminders.map((reminder, index) => {
                      const statusBadge = getStatusBadge(reminder.status);
                      return (
                        <div
                          key={`${reminder.id}-${reminder.status}-${index}`}
                          className="space-y-2"
                        >
                          <div className="flex justify-start">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                            >
                              {statusBadge.text}
                            </span>
                          </div>
                          <div
                            className={`${getCardStyle(
                              reminder.status
                            )} rounded-2xl p-4`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">
                                  {reminder.message || reminder.customMessage ||
                                    `Minum obat`}
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
                      );
                    })}
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
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {reminders.filter((r) => r.status === "scheduled").length}
                </div>
                <div className="text-sm text-gray-600">Terjadwal</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {reminders.filter((r) => r.status === "pending").length}
                </div>
                <div className="text-sm text-gray-600">Perlu Update</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center mt-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {
                    reminders.filter((r) => r.status === "completed_taken")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Dipatuhi</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {
                    reminders.filter((r) => r.status === "completed_not_taken")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Tidak Dipatuhi</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
