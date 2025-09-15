"use client";

import { Calendar } from "lucide-react";

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  completedDate: string;
  customMessage?: string;
  medicationTaken: boolean;
  confirmedAt: string;
  sentAt: string | null;
  notes?: string;
}

interface PatientComplianceStatsProps {
  completedReminders: CompletedReminder[];
}

export function PatientComplianceStats({
  completedReminders,
}: PatientComplianceStatsProps) {
  // Calculate compliance stats from completed reminders
  const taken = completedReminders.filter(
    (r: CompletedReminder) => r.medicationTaken
  ).length;
  const notTaken = completedReminders.filter(
    (r: CompletedReminder) => !r.medicationTaken
  ).length;
  const total = taken + notTaken;
  const complianceRate =
    total > 0 ? Math.round((taken / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <span>Statistik Kepatuhan</span>
      </h4>

      {/* Compliance Rate Display */}
      <div className="text-center mb-6">
        <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">
          {complianceRate}%
        </div>
        <p className="text-sm text-gray-600">
          Tingkat Kepatuhan Pasien
        </p>
      </div>

      {/* Real Stats Breakdown */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {taken}
            </div>
            <div className="text-sm text-gray-600">
              Dipatuhi
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {notTaken}
            </div>
            <div className="text-sm text-gray-600">
              Tidak Dipatuhi
            </div>
          </div>
        </div>
      )}
    </div>
  );
}