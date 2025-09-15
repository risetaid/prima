"use client";

interface MobileStatusBadgeProps {
  filteredPatientsCount: number;
  loading: boolean;
}

export function MobileStatusBadge({ filteredPatientsCount, loading }: MobileStatusBadgeProps) {
  return (
    <div className="lg:hidden mx-4 bg-blue-100 border-2 border-blue-500 text-blue-600 rounded-full px-6 py-3 text-center mb-4 mt-4">
      <span className="font-medium">
        {loading
          ? "Loading..."
          : `${filteredPatientsCount} pasien dalam pengawasan`}
      </span>
    </div>
  );
}