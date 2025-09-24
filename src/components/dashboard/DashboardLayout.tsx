"use client";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Nav } from "./Nav";
import { DashboardHeader } from "./DashboardHeader";
import { PatientList } from "./PatientList";
import { InstantSendSection } from "./instant-send-section";
import { MobileStatusBadge } from "./mobile-status-badge";
import { usePatientDashboard } from "@/hooks/usePatientDashboard";
import { useState } from "react";
import AddPatientDialog from "./add-patient-dialog";
import {
  InstantSendDialog,
  type InstantSendResult,
} from "./instant-send-dialog";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const {
    filteredPatients,
    loading,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    handleAddPatientSuccess,
    userRole,
  } = usePatientDashboard();

  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showInstantSendDialog, setShowInstantSendDialog] = useState(false);
  const [isInstantSending, setIsInstantSending] = useState(false);
  const [instantSendResult, setInstantSendResult] =
    useState<InstantSendResult | null>(null);

  const router = useRouter();

  const onPatientClick = (patientId: string) => {
    router.push(`/pasien/${patientId}`);
  };

  const onAddClick = () => {
    setShowAddPatientModal(true);
  };

  const onInstantSendAll = async () => {
    setIsInstantSending(true);
    setInstantSendResult(null);

    try {
      const response = await fetch("/api/reminders/instant-send-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      setInstantSendResult(result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to send reminders");
      }

      if (result.success && result.results?.messagesSent === 0) {
        setInstantSendResult({
          success: true,
          message: "No active reminders found to send",
          results: result.results,
        });
        return;
      }
    } catch (error) {
      setInstantSendResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsInstantSending(false);
    }
  };

  const onInstantSendClose = () => {
    setShowInstantSendDialog(false);
    setInstantSendResult(null);
  };

  const { isMobile } = useBreakpoint();
  const variant = isMobile ? "mobile" : "desktop";
  const patientCount = filteredPatients.length;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="fixed inset-0 bg-white md:bg-cover md:bg-center md:bg-no-repeat md:opacity-90 md:bg-[url('/bg_desktop.png')]" />
      </div>

      {/* Navigation */}
      <Nav variant={variant} />

      {/* Mobile Status Badge */}
      {isMobile && (
        <MobileStatusBadge
          filteredPatientsCount={patientCount}
          loading={loading}
        />
      )}

      {/* Header */}
      <DashboardHeader
        variant={variant}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        patientCount={patientCount}
        loading={loading}
        onAddClick={onAddClick}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
      />

      {/* Instant Send Section */}
      <InstantSendSection
        userRole={userRole}
        onOpenDialog={() => setShowInstantSendDialog(true)}
      />

      {/* Patient List */}
      <PatientList
        variant={variant}
        filteredPatients={filteredPatients}
        loading={loading}
        onPatientClick={onPatientClick}
      />

      {/* Dialogs */}
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
        onSendAll={onInstantSendAll}
        onClose={onInstantSendClose}
      />
    </div>
  );
}

export function DashboardLayout() {
  return <DashboardContent />;
}
