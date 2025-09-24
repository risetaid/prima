"use client";

import React from "react";
import Image from "next/image";
import { ReminderPageSkeleton } from "@/components/ui/dashboard-skeleton";
import { Patient } from "@/hooks/usePatientDashboard";

export type Variant = "mobile" | "desktop";

interface PatientListProps {
  variant: Variant;
  filteredPatients: Patient[];
  loading: boolean;
  onPatientClick: (id: string) => void;
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRandomAvatarColor = (name: string): string => {
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
  const hash = name.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};

const getComplianceLabel = (rate: number) => {
  if (rate >= 80)
    return { text: "Tinggi", bg: "bg-green-100", color: "text-green-800" };
  if (rate >= 50)
    return { text: "Sedang", bg: "bg-yellow-100", color: "text-yellow-800" };
  return { text: "Rendah", bg: "bg-red-100", color: "text-red-800" };
};

const PatientRow = React.memo(
  ({
    patient,
    variant,
    onPatientClick,
  }: {
    patient: Patient;
    variant: Variant;
    onPatientClick: (id: string) => void;
  }) => {
    const complianceLabel = getComplianceLabel(patient.complianceRate);
    const statusLabel = patient.isActive
      ? { text: "Aktif", bg: "bg-blue-500", color: "text-white" }
      : { text: "Nonaktif", bg: "bg-gray-400", color: "text-white" };

    if (variant === "mobile") {
      return (
        <div
          key={patient.id}
          onClick={() => onPatientClick(patient.id)}
          className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            {patient.photoUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={patient.photoUrl}
                  alt={patient.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-12 h-12 ${getRandomAvatarColor(
                  patient.name
                )} rounded-full flex items-center justify-center`}
              >
                <span className="text-white font-bold text-sm">
                  {getInitials(patient.name)}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {patient.name}
              </h3>
              <p className="text-sm text-gray-500">
                Kepatuhan: {patient.complianceRate}%
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span
              className={`${statusLabel.bg} ${statusLabel.color} px-3 py-1 rounded-full text-xs font-medium min-w-[60px] text-center`}
            >
              {statusLabel.text}
            </span>
            <span
              className={`${complianceLabel.bg} ${complianceLabel.color} px-3 py-1 rounded-full text-xs font-medium min-w-[60px] text-center`}
            >
              {complianceLabel.text}
            </span>
          </div>
        </div>
      );
    }

    // Desktop variant
    return (
      <div
        key={patient.id}
        className="grid grid-cols-6 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
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
              />
            </div>
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${getRandomAvatarColor(
                patient.name
              )}`}
            >
              <span className="text-white font-semibold text-lg">
                {getInitials(patient.name)}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="font-medium text-gray-900 truncate">{patient.name}</p>
        </div>

        {/* Status */}
        <div className="text-center">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusLabel.bg} ${statusLabel.color}`}
          >
            {statusLabel.text}
          </span>
        </div>

        {/* Compliance */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-l-lg text-sm font-bold">
            {patient.complianceRate}%
          </div>
          <span
            className={`${complianceLabel.bg} ${complianceLabel.color} px-4 py-2 rounded-r-lg text-sm font-bold`}
          >
            {complianceLabel.text}
          </span>
        </div>

        {/* Phone Number */}
        <div className="text-center">
          <p className="text-sm text-gray-600">{patient.phoneNumber}</p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onPatientClick(patient.id)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Lihat Detail
            <br />
            Pasien
          </button>
        </div>
      </div>
    );
  }
);

PatientRow.displayName = "PatientRow";

export function PatientList({
  variant,
  filteredPatients,
  loading,
  onPatientClick,
}: PatientListProps) {
  if (loading) {
    return <ReminderPageSkeleton />;
  }

  if (filteredPatients.length === 0) {
    return (
      <div
        className={
          variant === "mobile"
            ? "text-center py-8 px-4"
            : "px-6 py-12 text-center"
        }
      >
        <p className="text-gray-500 text-lg">
          {filteredPatients.length === 0
            ? "Belum ada pasien dalam pengawasan"
            : "Tidak ada pasien yang sesuai dengan filter"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "mobile" ? "space-y-3 px-4" : "divide-y divide-gray-100"
      }
    >
      {variant === "desktop" && (
        // Desktop Table Header
        <div className="bg-blue-600 text-white">
          <div className="grid grid-cols-6 px-6 py-4 font-medium text-center">
            <div>Profil</div>
            <div>Nama</div>
            <div>Status</div>
            <div>Kepatuhan</div>
            <div>Nomor WhatsApp</div>
            <div>Detail Pasien</div>
          </div>
        </div>
      )}
      {filteredPatients.map((patient) => (
        <PatientRow
          key={patient.id}
          patient={patient}
          variant={variant}
          onPatientClick={onPatientClick}
        />
      ))}
    </div>
  );
}
