"use client";

import { MessageSquare, Calendar, Zap } from "lucide-react";

interface Patient {
  verificationStatus: string;
  isActive: boolean;
}

interface PatientQuickActionsProps {
  patient: Patient;
  onAddReminder: () => void;
  onViewReminders: () => void;
}

export function PatientQuickActions({
  patient,
  onAddReminder,
  onViewReminders,
}: PatientQuickActionsProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 rounded-2xl border border-blue-200 shadow-sm">
      <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <span>Aksi Cepat</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={onAddReminder}
          disabled={
            !(
              patient.verificationStatus === "verified" &&
              patient.isActive
            )
          }
          className={`cursor-pointer py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 sm:space-x-3 transition-all duration-200 ${
            patient.verificationStatus === "verified" &&
            patient.isActive
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">
            Buat Pengingat
          </span>
        </button>
        {!(
          patient.verificationStatus === "verified" &&
          patient.isActive
        ) && (
          <p className="text-xs text-gray-500 sm:col-span-2 text-center">
            Pasien belum terverifikasi. Kirim verifikasi dan tunggu
            balasan &ldquo;YA&rdquo; untuk mengaktifkan fitur ini.
          </p>
        )}
        <button
          onClick={onViewReminders}
          className="cursor-pointer bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 sm:space-x-3 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">
            Lihat Pengingat
          </span>
        </button>
      </div>
      {/* Tips */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs sm:text-sm text-gray-600 text-center">
          💡 <strong>Tips:</strong> Gunakan {"\""}Buat
          Pengingat{"\""} untuk sistem auto-fill dengan template
          WhatsApp
        </p>
      </div>
    </div>
  );
}