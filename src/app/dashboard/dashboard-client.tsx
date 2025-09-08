"use client";

import { useRouter } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { useCallback, memo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import AddPatientDialog from "@/components/dashboard/add-patient-dialog";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { PatientListTable } from "@/components/dashboard/patient-list-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Patient {
  id: string;
  name: string;
  complianceRate: number;
  isActive: boolean;
  photoUrl?: string;
  phoneNumber?: string;
}

function DashboardClient() {
  const router = useRouter();
  const { user: _user } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [_dashboardStats, setDashboardStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
  });
  const [showInstantSendDialog, setShowInstantSendDialog] = useState(false);
  const [isInstantSending, setIsInstantSending] = useState(false);
  const [instantSendResult, setInstantSendResult] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchQuery, activeFilters]);

  const fetchDashboardData = async () => {
    try {
      // Single optimized API call for all dashboard data
      const response = await fetch("/api/dashboard/overview");
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
        setUserRole(data.user.role);
        setDashboardStats(data.stats);
      } else {
        // Fallback to separate calls if needed
        console.warn(
          "Failed to fetch dashboard overview, falling back to separate endpoints"
        );
        await Promise.all([fetchPatientsLegacy(), fetchUserRoleLegacy()]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Try legacy methods as fallback
      await Promise.all([fetchPatientsLegacy(), fetchUserRoleLegacy()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoleLegacy = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchPatientsLegacy = async () => {
    try {
      const response = await fetch("/api/patients");
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    if (searchQuery.trim()) {
      filtered = filtered.filter((patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply multiple status filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter((patient) => {
        const isActive = patient.isActive;
        return (
          (activeFilters.includes("active") && isActive) ||
          (activeFilters.includes("inactive") && !isActive)
        );
      });
    }

    setFilteredPatients(filtered);
  };

  const handlePengingatClick = useCallback(() => {
    router.push("/dashboard/pengingat");
  }, [router]);

  const handleBeritaClick = useCallback(() => {
    router.push("/dashboard/berita");
  }, [router]);

  const handleVideoClick = useCallback(() => {
    router.push("/dashboard/video");
  }, [router]);

  const handleAddPatientClick = useCallback(() => {
    setShowAddPatientModal(true);
  }, []);

  const handleAddPatientSuccess = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleInstantSendAll = useCallback(async () => {
    setIsInstantSending(true);
    setInstantSendResult(null);
    
    try {
      const response = await fetch('/api/reminders/instant-send-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      setInstantSendResult(result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending instant reminders:', error);
      setInstantSendResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsInstantSending(false);
    }
  }, []);

  const handleInstantSendClose = useCallback(() => {
    setShowInstantSendDialog(false);
    setInstantSendResult(null);
  }, []);

  const toggleFilter = useCallback((filterType: string) => {
    setActiveFilters((prev) => {
      if (prev.includes(filterType)) {
        // Remove filter if already active
        return prev.filter((f) => f !== filterType);
      } else {
        // Add filter if not active
        return [...prev, filterType];
      }
    });
  }, []);

  const handlePatientClick = useCallback(
    (patientId: string) => {
      router.push(`/dashboard/pasien/${patientId}`);
    },
    [router]
  );

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
    return colors[Math.abs(hash) % colors.length];
  };

  const getComplianceLabel = (rate: number) => {
    if (rate >= 80)
      return { text: "Tinggi", bg: "bg-green-100", color: "text-green-800" };
    if (rate >= 50)
      return { text: "Sedang", bg: "bg-yellow-100", color: "text-yellow-800" };
    return { text: "Rendah", bg: "bg-red-100", color: "text-red-800" };
  };

  return (
    <>
      {/* Blue Background Section - Mobile Only */}
      <div className="lg:hidden bg-blue-500 px-6 py-8">
        <div className="flex space-x-6 justify-center pb-4">
          {/* Pengingat */}
          <div className="text-center flex-shrink-0 min-w-[80px]">
            <div
              onClick={handlePengingatClick}
              className="cursor-pointer hover:scale-105 transition-transform mb-3"
            >
              <Image
                src="/btn_pengingat.png"
                alt="Pengingat"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h3 className="font-semibold text-sm text-white">Pengingat</h3>
          </div>

          {/* Berita */}
          <div className="text-center flex-shrink-0 min-w-[80px]">
            <div
              onClick={handleBeritaClick}
              className="cursor-pointer hover:scale-105 transition-transform mb-3"
            >
              <Image
                src="/btn_berita.png"
                alt="Berita"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h3 className="font-semibold text-sm text-white">Berita</h3>
          </div>

          {/* Video Edukasi */}
          <div className="text-center flex-shrink-0 min-w-[80px]">
            <div
              onClick={handleVideoClick}
              className="cursor-pointer hover:scale-105 transition-transform mb-3"
            >
              <Image
                src="/btn_videoEdukasi.png"
                alt="Video Edukasi"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h3 className="font-semibold text-sm text-white">Video Edukasi</h3>
          </div>
        </div>
      </div>

      {/* Desktop: Header Section */}
      <div className="hidden lg:block ">
        <div className="bg-blue-600 text-white py-6">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between">
              {/* Left: Search Bar */}
              <div className="relative bg-white rounded-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari Pasien"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-80 text-gray-900"
                />
              </div>

              {/* Center: Patient Count with Plus Button */}
              <div className="flex items-center space-x-4">
                <h1 className="text-white text-3xl font-bold">
                  {loading
                    ? "Loading..."
                    : `${filteredPatients.length} Pasien Dalam Pengawasan`}
                </h1>
                <button
                  onClick={handleAddPatientClick}
                  className="bg-white text-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-50 transition-colors shadow-md"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Right: Filter Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => toggleFilter("active")}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilters.includes("active")
                      ? "bg-white text-blue-500 shadow-md"
                      : "bg-blue-400 text-white hover:bg-blue-300"
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => toggleFilter("inactive")}
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

      {/* Mobile: Status Badge */}
      <div className="lg:hidden mx-4 bg-blue-100 border-2 border-blue-500 text-blue-600 rounded-full px-6 py-3 text-center mb-4 mt-4">
        <span className="font-medium">
          {loading
            ? "Loading..."
            : `${filteredPatients.length} pasien dalam pengawasan`}
        </span>
      </div>

      {/* Instant Send Section - Admin Only */}
      {(userRole === 'ADMIN' || userRole === 'SUPERADMIN') && (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-400">
            {/* Desktop Layout */}
            <div className="hidden lg:flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Kirim Semua Pengingat</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Kirim pesan pengingat ke semua pasien yang Anda kelola secara instan
                </p>
              </div>
              <Button
                onClick={() => setShowInstantSendDialog(true)}
                variant="destructive"
                size="lg"
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kirim Semua
              </Button>
            </div>
            
            {/* Mobile Layout */}
            <div className="lg:hidden">
              <div className="text-center">
                <h3 className="text-base font-medium text-gray-900">Kirim Semua Pengingat</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  Kirim pesan ke semua pasien Anda secara instan
                </p>
                <Button
                  onClick={() => setShowInstantSendDialog(true)}
                  variant="destructive"
                  size="default"
                  className="flex items-center gap-2 w-full justify-center"
                >
                  <Send className="w-4 h-4" />
                  Kirim Semua Pengingat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient List Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Mobile: Title and Controls */}
        <div className="lg:hidden flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Daftar Pasien</h2>
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="cari"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Add Patient Button */}
            <div
              onClick={handleAddPatientClick}
              className="bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Mobile: Filter Buttons */}
        <div className="lg:hidden flex space-x-3 mb-6">
          <button
            onClick={() => toggleFilter("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeFilters.includes("active")
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => toggleFilter("inactive")}
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
                    onClick={() => handlePatientClick(patient.id)}
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
                      onClick={handleAddPatientClick}
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
                    onClick={() => router.push("/dashboard/pasien")}
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

      {/* Add Patient Dialog */}
      <AddPatientDialog
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onSuccess={handleAddPatientSuccess}
      />

      {/* Instant Send Dialog */}
      <Dialog open={showInstantSendDialog} onOpenChange={setShowInstantSendDialog}>
        <DialogContent className="max-w-sm sm:max-w-md mx-2 sm:mx-4">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base sm:text-lg font-semibold leading-tight">
              Konfirmasi Kirim Pengingat Hari Ini
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {!instantSendResult ? (
                "Kirim pesan pengingat hari ini ke semua pasien Anda sekarang?"
              ) : (
                "Hasil pengiriman:"
              )}
            </DialogDescription>
          </DialogHeader>

          {instantSendResult && (
            <div className={`p-3 sm:p-4 rounded-lg text-sm ${instantSendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className={`font-medium ${instantSendResult.success ? 'text-green-800' : 'text-red-800'} mb-2`}>
                {instantSendResult.message || instantSendResult.error}
              </div>
              {instantSendResult.results && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>📊 Ditemukan: <span className="font-medium">{instantSendResult.results.remindersFound}</span></div>
                  <div>✅ Terkirim: <span className="font-medium">{instantSendResult.results.messagesSent}</span></div>
                  <div>❌ Error: <span className="font-medium">{instantSendResult.results.errors}</span></div>
                  <div>📈 Sukses: <span className="font-medium">{instantSendResult.results.successRate}</span></div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-2">
            {!instantSendResult ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowInstantSendDialog(false)}
                  className="w-full sm:w-auto order-2 sm:order-1 h-10"
                >
                  Batal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleInstantSendAll}
                  disabled={isInstantSending}
                  className="w-full sm:w-auto order-1 sm:order-2 h-10"
                >
                  {isInstantSending ? (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Mengirim...
                    </div>
                  ) : (
                    "Ya, Kirim Sekarang"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleInstantSendClose} className="w-full sm:w-auto h-10">
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(DashboardClient);
