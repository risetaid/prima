"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo, useEffect } from "react";
import AddPatientDialog from "@/components/dashboard/add-patient-dialog";
import { MobileNavigationButtons } from "@/components/dashboard/mobile-navigation-buttons";
import { DesktopHeader } from "@/components/dashboard/desktop-header";
import { MobileStatusBadge } from "@/components/dashboard/mobile-status-badge";
import { InstantSendSection } from "@/components/dashboard/instant-send-section";
import { PatientListSection } from "@/components/dashboard/patient-list-section";
import { InstantSendDialog } from "@/components/dashboard/instant-send-dialog";
import { useDashboardState } from "@/hooks/use-dashboard-state";

import { logger } from '@/lib/logger';
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
      logger.error("Error fetching user role:", error instanceof Error ? error : new Error(String(error)));
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
      logger.error("Error fetching patients:", error instanceof Error ? error : new Error(String(error)));
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
      logger.error("Error fetching dashboard data:", error instanceof Error ? error : new Error(String(error)));
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

  const handleInstantSendAll = useCallback(async () => {
    actions.setIsInstantSending(true);
    actions.setInstantSendResult(null);
    
    try {
      const response = await fetch('/api/reminders/instant-send-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
       const result = await response.json();
       actions.setInstantSendResult(result);

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
         actions.setInstantSendResult({
           success: true,
           message: result.message || 'No active reminders found to send',
           results: result.results
         });
         return;
       }
    } catch (error: unknown) {
      logger.error('Error sending instant reminders:', error instanceof Error ? error : new Error(String(error)));
      actions.setInstantSendResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      actions.setIsInstantSending(false);
    }
  }, [actions]);

  const handleInstantSendClose = useCallback(() => {
    actions.resetInstantSend();
  }, [actions]);

  const toggleFilter = useCallback((filterType: string) => {
    actions.toggleFilter(filterType);
  }, [actions]);

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

      <InstantSendSection
        userRole={state.userRole}
        onOpenDialog={() => actions.setShowInstantSendDialog(true)}
      />

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

      <InstantSendDialog
        isOpen={state.showInstantSendDialog}
        onOpenChange={actions.setShowInstantSendDialog}
        isSending={state.isInstantSending}
        result={state.instantSendResult}
        onSendAll={handleInstantSendAll}
        onClose={handleInstantSendClose}
      />
    </>
  );
}

export default memo(DashboardClient);

