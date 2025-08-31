"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, memo, useMemo, useCallback } from "react";

interface Patient {
  id: string;
  name: string;
  complianceRate: number;
  isActive: boolean;
  photoUrl?: string;
  phoneNumber?: string;
}

interface ReminderListTableProps {
  patients: Patient[];
  loading: boolean;
}

// Memoized patient row component
const PatientRow = memo(({ patient, onClick }: { patient: Patient; onClick: (id: string) => void }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-teal-500",
      "bg-emerald-500",
      "bg-lime-500",
      "bg-orange-500",
      "bg-rose-500",
      "bg-violet-500",
      "bg-sky-500",
    ];
    // Use name hash to ensure consistent color per person
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const selectedColor = colors[Math.abs(hash) % colors.length];
    return selectedColor;
  };

  const handleClick = useCallback(() => {
    onClick(patient.id);
  }, [patient.id, onClick]);

  return (
    <div
      key={patient.id}
      className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {patient.photoUrl ? (
            <Image
              src={patient.photoUrl}
              alt={patient.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getRandomAvatarColor(
                patient.name
              )}`}
            >
              {getInitials(patient.name)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {patient.name}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                patient.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {patient.isActive ? "Aktif" : "Non-aktif"}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{patient.phoneNumber}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {patient.complianceRate}%
            </p>
            <p className="text-xs text-gray-500">Kepatuhan</p>
          </div>
        </div>
      </div>
    </div>
  );
});

PatientRow.displayName = "PatientRow";

export const ReminderListTable = memo(({
  patients,
  loading,
}: ReminderListTableProps) => {
  const router = useRouter();

  // Memoized click handler to prevent unnecessary re-renders
  const handlePatientClick = useCallback((patientId: string) => {
    router.push(`/dashboard/pengingat/pasien/${patientId}`);
  }, [router]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-teal-500",
      "bg-emerald-500",
      "bg-lime-500",
      "bg-orange-500",
      "bg-rose-500",
      "bg-violet-500",
      "bg-sky-500",
    ];
    // Use name hash to ensure consistent color per person
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const selectedColor = colors[Math.abs(hash) % colors.length];
    return selectedColor;
  };

  const getComplianceLabel = (rate: number) => {
    if (rate >= 80)
      return {
        text: "Tinggi",
        bg: "bg-green-100",
        textColor: "text-green-800",
      };
    if (rate >= 50)
      return {
        text: "Sedang",
        bg: "bg-yellow-100",
        textColor: "text-yellow-800",
      };
    return { text: "Rendah", bg: "bg-red-100", textColor: "text-red-800" };
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "-";
    // Format Indonesian phone number for display
    if (phone.startsWith("62")) {
      return "+62" + phone.substring(2);
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pasien...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Table Header */}
      <div className="bg-blue-600 text-white">
        <div className="grid grid-cols-6 px-6 py-4 font-medium">
          <div>Profil</div>
          <div>Nama</div>
          <div>Status</div>
          <div>Kepatuhan</div>
          <div>Nomor WhatsApp</div>
          <div>Detail Pengingat</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100">
        {patients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-lg">
              Belum ada pasien dalam pengawasan
            </p>
          </div>
        ) : (
          patients.map((patient) => {
            const complianceLabel = getComplianceLabel(patient.complianceRate);
            const statusLabel = patient.isActive
              ? { text: "Aktif", bg: "bg-blue-500", textColor: "text-white" }
              : {
                  text: "Nonaktif",
                  bg: "bg-gray-400",
                  textColor: "text-white",
                };

            return (
              <div
                key={patient.id}
                className="grid grid-cols-6 px-6 py-4 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handlePatientClick(patient.id)}
              >
                {/* Profile Photo */}
                <div className="flex justify-center">
                  {patient.photoUrl ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                      <Image
                        src={patient.photoUrl}
                        alt={patient.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRandomAvatarColor(patient.name)}`}>
                      <span className="text-white font-semibold text-lg">
                        {getInitials(patient.name)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <p className="font-medium text-gray-900 truncate">
                    {patient.name}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusLabel.bg} ${statusLabel.textColor}`}
                  >
                    {statusLabel.text}
                  </span>
                </div>

                {/* Compliance */}
                <div className="flex items-center">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-l-lg text-sm font-bold">
                    {patient.complianceRate}%
                  </div>
                  <span
                    className={`${complianceLabel.bg} ${complianceLabel.textColor} px-4 py-2 rounded-r-lg text-sm font-bold`}
                  >
                    {complianceLabel.text}
                  </span>
                </div>

                {/* Phone Number */}
                <div>
                  <p className="text-sm text-gray-600">
                    {formatPhoneNumber(patient.phoneNumber)}
                  </p>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                    Lihat Detail
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

ReminderListTable.displayName = "ReminderListTable";

// Export default as the optimized version
export default ReminderListTable;  
