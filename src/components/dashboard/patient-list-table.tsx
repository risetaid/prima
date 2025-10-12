"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
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

interface PatientListTableProps {
  patients: Patient[];
  loading: boolean;
}

export function PatientListTable({ patients, loading }: PatientListTableProps) {
  const router = useRouter();

  const handlePatientClick = (patientId: string) => {
    router.push(`/pasien/${patientId}`);
  };

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
          <div>Detail Pasien</div>
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
            const statusLabel = getStatusLabel(patient.isActive);
            const avatar = generateAvatar(patient.name);

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
                      className={`w-12 h-12 ${avatar.color} rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-sm">
                        {avatar.initials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {patient.name}
                  </h3>
                </div>

                {/* Status */}
                <div className="text-center">
                  <span
                    className={`${statusLabel.bg} ${statusLabel.textColor} px-3 py-1 rounded-full text-sm font-medium inline-block`}
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
                <div className="text-gray-700 text-center">
                  {formatIndonesianPhone(patient.phoneNumber)}
                </div>

                {/* Action Button */}
                <div className="text-center">
                  <button
                    onClick={() => handlePatientClick(patient.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                  >
                    Lihat Detail
                    <br />
                    Pasien
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

