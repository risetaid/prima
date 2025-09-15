"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo, useState, useEffect } from "react";
import AddPatientDialog from "@/components/dashboard/add-patient-dialog";
import { MobileNavigationButtons } from "@/components/dashboard/mobile-navigation-buttons";
import { DesktopHeader } from "@/components/dashboard/desktop-header";
import { MobileStatusBadge } from "@/components/dashboard/mobile-status-badge";
import { InstantSendSection } from "@/components/dashboard/instant-send-section";
import { PatientListSection } from "@/components/dashboard/patient-list-section";
import { InstantSendDialog, type InstantSendResult } from "@/components/dashboard/instant-send-dialog";

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [, setDashboardStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
  });
  const [showInstantSendDialog, setShowInstantSendDialog] = useState(false);
  const [isInstantSending, setIsInstantSending] = useState(false);
  const [instantSendResult, setInstantSendResult] = useState<InstantSendResult | null>(null);

  const fetchDashboardData = useCallback(async () => {
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
  }, []);

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

  const filterPatients = useCallback(() => {
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
  }, [patients, searchQuery, activeFilters]);

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
         // Handle specific error types
         if (result.error?.includes('Database query failed')) {
           throw new Error('Database error occurred. Please try again.');
         } else if (result.error?.includes('Unauthorized')) {
           throw new Error('Authentication failed. Please refresh the page.');
         } else {
           throw new Error(result.error || result.details || 'Failed to send reminders');
         }
       }

       // Handle successful response but no reminders sent
       if (result.success && result.results && result.results.messagesSent === 0) {
         setInstantSendResult({
           success: true,
           message: result.message || 'No active reminders found to send',
           results: result.results
         });
         return;
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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    filterPatients();
  }, [filterPatients, patients, searchQuery, activeFilters]);

  return (
    <>
      <MobileNavigationButtons
        onPengingatClick={handlePengingatClick}
        onBeritaClick={handleBeritaClick}
        onVideoClick={handleVideoClick}
      />

      <DesktopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredPatientsCount={filteredPatients.length}
        loading={loading}
        onAddPatientClick={handleAddPatientClick}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
      />

      <MobileStatusBadge
        filteredPatientsCount={filteredPatients.length}
        loading={loading}
      />

      <InstantSendSection
        userRole={userRole}
        onOpenDialog={() => setShowInstantSendDialog(true)}
      />

      <PatientListSection
        patients={patients}
        filteredPatients={filteredPatients}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddPatientClick={handleAddPatientClick}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onPatientClick={handlePatientClick}
      />

      <AddPatientDialog
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onSuccess={handleAddPatientSuccess}
      />

      <InstantSendDialog
        isOpen={showInstantSendDialog}
        onOpenChange={setShowInstantSendDialog}
        isSending={isInstantSending}
        result={instantSendResult}
        onSendAll={handleInstantSendAll}
        onClose={handleInstantSendClose}
      />
    </>
  );
}

export default memo(DashboardClient);

