"use client";

import { Search, Plus } from "lucide-react";

export type Variant = "mobile" | "desktop";

interface DashboardHeaderProps {
  variant: Variant;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  patientCount: number;
  loading: boolean;
  onAddClick: () => void;
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
}

export function DashboardHeader({
  variant,
  searchQuery,
  onSearchChange,
  patientCount,
  loading,
  onAddClick,
  activeFilters,
  onToggleFilter,
}: DashboardHeaderProps) {
  if (variant === "mobile") {
    return (
      <div className="px-4 lg:px-8 pb-6">
        {/* Mobile: Title Row */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 text-center">
            Daftar Pasien
          </h2>
        </div>

        {/* Mobile: Controls Row */}
        <div className="flex items-center space-x-4 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Pasien..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Cari pasien"
            />
          </div>
          {/* Add Patient Button */}
          <button
            onClick={onAddClick}
            className="bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors flex-shrink-0"
            aria-label="Tambah pasien baru"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Mobile: Filter Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => onToggleFilter("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer flex-1 ${
              activeFilters.includes("active")
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            aria-label="Filter pasien aktif"
            aria-pressed={activeFilters.includes("active")}
          >
            Aktif
          </button>
          <button
            onClick={() => onToggleFilter("inactive")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer flex-1 ${
              activeFilters.includes("inactive")
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            aria-label="Filter pasien nonaktif"
            aria-pressed={activeFilters.includes("inactive")}
          >
            Nonaktif
          </button>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <>
      {/* Desktop: Status Badge (shared but styled for desktop) */}
      <div className="lg:hidden mx-4 bg-blue-100 border-2 border-blue-500 text-blue-600 rounded-full px-6 py-3 text-center mb-4 mt-4">
        <span className="font-medium">
          {loading ? "Loading..." : `${patientCount} Pasien dalam Pengawasan`}
        </span>
      </div>

      {/* Desktop: Header Section */}
      <div className="bg-blue-600 text-white py-6">
        <div className="px-8">
          <div className="flex items-center justify-between">
            {/* Left: Search Bar */}
            <div className="relative bg-white rounded-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari Pasien"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-3 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-80 text-gray-900"
                aria-label="Cari pasien"
              />
            </div>

            {/* Center: Patient Count + Add Button */}
            <div className="flex items-center space-x-4">
              <h1 className="text-white text-3xl font-bold">
                {loading
                  ? "Loading..."
                  : `${patientCount} Pasien Dalam Pengawasan`}
              </h1>
              <button
                onClick={onAddClick}
                className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                aria-label="Tambah pasien baru"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {/* Right: Filter Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => onToggleFilter("active")}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  activeFilters.includes("active")
                    ? "bg-white text-blue-500 shadow-md"
                    : "bg-blue-400 text-white hover:bg-blue-300"
                }`}
                aria-label="Filter pasien aktif"
                aria-pressed={activeFilters.includes("active")}
              >
                Aktif
              </button>
              <button
                onClick={() => onToggleFilter("inactive")}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  activeFilters.includes("inactive")
                    ? "bg-white text-blue-500 shadow-md"
                    : "bg-blue-400 text-white hover:bg-blue-300"
                }`}
                aria-label="Filter pasien nonaktif"
                aria-pressed={activeFilters.includes("inactive")}
              >
                Nonaktif
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
