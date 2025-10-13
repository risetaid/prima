"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo, useEffect } from "react";
import AddPatientDialog from "@/components/dashboard/add-patient-dialog";
import { MobileNavigationButtons } from "@/components/dashboard/mobile-navigation-buttons";
import { DesktopHeader } from "@/components/dashboard/desktop-header";
import { MobileStatusBadge } from "@/components/dashboard/mobile-status-badge";
// Instant send feature removed
import { PatientListSection } from "@/components/dashboard/patient-list-section";
import { useDashboardState } from "@/hooks/use-dashboard-state";

import { logger } from "@/lib/logger";
function DashboardClient() {
  const router = useRouter();
  const { state, actions, filterPatients } = useDashboardState();

  const fetchUserRoleLegacy = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        actions.setUserRole(data.role);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching user role:",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [actions]);

  const fetchPatientsLegacy = useCallback(async () => {
    try {
      const response = await fetch("/api/patients");
      if (response.ok) {
        const data = await response.json();
        actions.setPatients(data);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching patients:",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [actions]);

  const fetchDashboardData = useCallback(async () => {
    try {
      actions.setLoading(true);
      // Single optimized API call for all dashboard data
      const response = await fetch("/api/dashboard/overview");
      if (response.ok) {
        const data = await response.json();
        actions.setPatients(data.patients);
        actions.setUserRole(data.user.role);
        actions.setDashboardStats(data.stats);
      } else {
        // Fallback to separate calls if needed
        logger.warn(
          "Failed to fetch dashboard overview, falling back to separate endpoints"
        );
        await Promise.all([fetchPatientsLegacy(), fetchUserRoleLegacy()]);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching dashboard data:",
        error instanceof Error ? error : new Error(String(error))
      );
      // Try legacy methods as fallback
      await Promise.all([fetchPatientsLegacy(), fetchUserRoleLegacy()]);
    } finally {
      actions.setLoading(false);
    }
  }, [actions, fetchPatientsLegacy, fetchUserRoleLegacy]);

  // Filter patients when state changes
  useEffect(() => {
    filterPatients();
  }, [filterPatients]);

  const handlePengingatClick = useCallback(() => {
    router.push("/pengingat");
  }, [router]);

  const handleBeritaClick = useCallback(() => {
    router.push("/berita");
  }, [router]);

  const handleVideoClick = useCallback(() => {
    router.push("/video-edukasi");
  }, [router]);

  const handleAddPatientClick = useCallback(() => {
    actions.setShowAddPatientModal(true);
  }, [actions]);

  const handleAddPatientSuccess = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Instant send handlers removed with feature

  const toggleFilter = useCallback(
    (filterType: string) => {
      actions.toggleFilter(filterType);
    },
    [actions]
  );

  const handlePatientClick = useCallback(
    (patientId: string) => {
      router.push(`/pasien/${patientId}`);
    },
    [router]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <>
      <MobileNavigationButtons
        onPengingatClick={handlePengingatClick}
        onBeritaClick={handleBeritaClick}
        onVideoClick={handleVideoClick}
      />

      <DesktopHeader
        searchQuery={state.searchQuery}
        onSearchChange={actions.setSearchQuery}
        filteredPatientsCount={state.filteredPatients.length}
        loading={state.loading}
        onAddPatientClick={handleAddPatientClick}
        activeFilters={state.activeFilters}
        onToggleFilter={toggleFilter}
      />

      <MobileStatusBadge
        filteredPatientsCount={state.filteredPatients.length}
        loading={state.loading}
      />

      {/* Instant send section removed */}

      <PatientListSection
        patients={state.patients}
        filteredPatients={state.filteredPatients}
        loading={state.loading}
        searchQuery={state.searchQuery}
        onSearchChange={actions.setSearchQuery}
        onAddPatientClick={handleAddPatientClick}
        activeFilters={state.activeFilters}
        onToggleFilter={toggleFilter}
        onPatientClick={handlePatientClick}
      />

      <AddPatientDialog
        isOpen={state.showAddPatientModal}
        onClose={() => actions.setShowAddPatientModal(false)}
        onSuccess={handleAddPatientSuccess}
      />

      {/* Instant send dialog removed */}
    </>
  );
}

export default memo(DashboardClient);
