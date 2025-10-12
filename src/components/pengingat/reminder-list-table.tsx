"use client";

import { useRouter } from "next/navigation";
import { ProfileImage } from "@/components/ui/optimized-image";
import { memo, useCallback } from "react";
import {
  generateAvatar,
  getComplianceLabel,
  formatIndonesianPhone,
  getStatusLabel,
} from "@/lib/ui-utils";

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
const PatientRow = memo(
  ({
    patient,
    onClick,
  }: {
    patient: Patient;
    onClick: (id: string) => void;
  }) => {
    const avatar = generateAvatar(patient.name);
    const statusLabel = getStatusLabel(patient.isActive);

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
              <ProfileImage
                src={patient.photoUrl}
                alt={patient.name}
                size={48}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${avatar.color}`}
              >
                {avatar.initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {patient.name}
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabel.bg} ${statusLabel.textColor}`}
              >
                {statusLabel.text}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {formatIndonesianPhone(patient.phoneNumber)}
            </p>
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
  }
);

PatientRow.displayName = "PatientRow";

export const ReminderListTable = memo(
  ({ patients, loading }: ReminderListTableProps) => {
    const router = useRouter();

    // Memoized click handler to prevent unnecessary re-renders
    const handlePatientClick = useCallback(
      (patientId: string) => {
        router.push(`/pengingat/pasien/${patientId}`);
      },
      [router]
    );

    if (loading) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Table Header */}
        <div className="bg-blue-600 text-white">
          <div className="grid grid-cols-6 px-6 py-4 font-medium text-center">
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
              const complianceLabel = getComplianceLabel(
                patient.complianceRate
              );
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
                  className="grid grid-cols-6 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                >
                  {/* Profile Photo */}
                  <div className="flex justify-center">
                    {patient.photoUrl ? (
                      <div className="border-2 border-gray-200 rounded-full">
                        <ProfileImage
                          src={patient.photoUrl}
                          alt={patient.name}
                          size={48}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${generateAvatar(patient.name).color}`}
                      >
                        <span className="text-white font-semibold text-lg">
                          {generateAvatar(patient.name).initials}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <p className="font-medium text-gray-900 truncate">
                      {patient.name}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusLabel.bg} ${statusLabel.textColor}`}
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
                      className={`${complianceLabel.bg} ${complianceLabel.textColor} px-4 py-2 rounded-r-lg text-sm font-bold`}
                    >
                      {complianceLabel.text}
                    </span>
                  </div>

                  {/* Phone Number */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {formatIndonesianPhone(patient.phoneNumber)}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => handlePatientClick(patient.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Lihat Detail
                      <br />
                      Pengingat
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
);

ReminderListTable.displayName = "ReminderListTable";

// Export default as the optimized version
export default ReminderListTable;

