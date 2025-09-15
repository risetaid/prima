"use client";

import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import Image from "next/image";
import { PatientListTable } from "@/components/dashboard/patient-list-table";

interface Patient {
  id: string;
  name: string;
  complianceRate: number;
  isActive: boolean;
  photoUrl?: string;
  phoneNumber?: string;
}

interface PatientListSectionProps {
  patients: Patient[];
  filteredPatients: Patient[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddPatientClick: () => void;
  activeFilters: string[];
  onToggleFilter: (filterType: string) => void;
  onPatientClick: (patientId: string) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRandomAvatarColor(name: string) {
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
  return colors[Math.abs(hash) % colors.length];
}

function getComplianceLabel(rate: number) {
  if (rate >= 80)
    return { text: "Tinggi", bg: "bg-green-100", color: "text-green-800" };
  if (rate >= 50)
    return { text: "Sedang", bg: "bg-yellow-100", color: "text-yellow-800" };
  return { text: "Rendah", bg: "bg-red-100", color: "text-red-800" };
}

export function PatientListSection({
  patients,
  filteredPatients,
  loading,
  searchQuery,
  onSearchChange,
  onAddPatientClick,
  activeFilters,
  onToggleFilter,
  onPatientClick,
}: PatientListSectionProps) {
  const router = useRouter();

  return (
    <div className="px-4 lg:px-8 pb-6">
      {/* Mobile: Title Row */}
      <div className="lg:hidden mb-4">
        <h2 className="text-xl font-bold text-gray-900 text-center">Daftar Pasien</h2>
      </div>

      {/* Mobile: Controls Row */}
      <div className="lg:hidden flex items-center space-x-4 mb-6">
        {/* Search Bar - Flexible Width */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="cari"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {/* Add Patient Button */}
        <div
          onClick={onAddPatientClick}
          className="bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors flex-shrink-0"
        >
          <Plus className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Mobile: Filter Buttons */}
      <div className="lg:hidden flex space-x-4 mb-6">
        <button
          onClick={() => onToggleFilter("active")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeFilters.includes("active")
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Aktif
        </button>
        <button
          onClick={() => onToggleFilter("inactive")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeFilters.includes("inactive")
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Nonaktif
        </button>
      </div>

      {/* Desktop: Table View */}
      <div className="hidden lg:block">
        <PatientListTable patients={filteredPatients} loading={loading} />
      </div>

      {/* Mobile: Card View */}
      <div className="lg:hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatients.slice(0, 8).map((patient) => {
              const complianceLabel = getComplianceLabel(
                patient.complianceRate
              );
              const statusLabel = patient.isActive
                ? { text: "Aktif", bg: "bg-blue-500", color: "text-white" }
                : {
                    text: "Nonaktif",
                    bg: "bg-gray-500",
                    color: "text-white",
                  };

              return (
                <div
                  key={patient.id}
                  onClick={() => onPatientClick(patient.id)}
                  className="bg-white rounded-xl p-5 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
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
            })}

            {filteredPatients.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {patients.length === 0
                    ? "Belum ada pasien"
                    : "Tidak ada pasien yang cocok dengan pencarian"}
                </p>
                {patients.length === 0 && (
                  <button
                    onClick={onAddPatientClick}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Tambah Pasien Pertama
                  </button>
                )}
              </div>
            )}

            {filteredPatients.length > 8 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => router.push("/pasien")}
                  className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Lihat Semua Pasien ({filteredPatients.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}