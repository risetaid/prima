"use client";

import { Plus, Search } from "lucide-react";

interface DesktopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredPatientsCount: number;
  loading: boolean;
  onAddPatientClick: () => void;
  activeFilters: string[];
  onToggleFilter: (filterType: string) => void;
}

export function DesktopHeader({
  searchQuery,
  onSearchChange,
  filteredPatientsCount,
  loading,
  onAddPatientClick,
  activeFilters,
  onToggleFilter,
}: DesktopHeaderProps) {
  return (
    <div className="hidden lg:block">
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
              />
            </div>

            {/* Center: Patient Count with Plus Button */}
            <div className="flex items-center space-x-4">
              <h1 className="text-white text-3xl font-bold">
                {loading
                  ? "Loading..."
                  : `${filteredPatientsCount} Pasien Dalam Pengawasan`}
              </h1>
              <button
                onClick={onAddPatientClick}
                className="bg-white text-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-50 transition-colors shadow-md"
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
              >
                Nonaktif
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}