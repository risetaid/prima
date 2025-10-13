"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";
import { PatientHeaderCard } from "@/components/patient/patient-header-card";
import { PatientProfileTabCombined } from "@/components/patient/patient-profile-tab-combined";
import { PatientRemindersTab } from "@/components/patient/patient-reminders-tab";
import { PatientVerificationTab } from "@/components/patient/patient-verification-tab";
import PatientResponseHistoryTab from "@/components/patient/patient-response-history-tab";
import {
  NavigationCard,
  NavigationItem,
} from "@/components/patient/navigation-card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Patient as SchemaPatient } from "@/db/schema";
import {
  AlertTriangle,
  User,
  CheckCircle,
  Bell,
  MessageSquare,
} from "lucide-react";

interface Patient extends SchemaPatient {
  complianceRate: number;
  assignedVolunteer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string | null;
  } | null;
}

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  confirmedAt: string;
  sentAt: string | null;
  notes?: string;
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [completedReminders, setCompletedReminders] = useState<
    CompletedReminder[]
  >([]);
  const [reminderStats, setReminderStats] = useState<{
    semua: number;
    selesai: number;
    terjadwal: number;
    perluDiperbarui: number;
  } | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Edit mode state (combined)
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Form data state (combined)
  const [profileForm, setProfileForm] = useState({
    // Basic info
    name: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
    diagnosisDate: "",
    // Medical info
    cancerStage: "",
    doctorName: "",
    hospitalName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });

  // Ref to track previous verification status for toast notifications
  const prevVerificationStatus = useRef<string | null>(null);

  // Navigation items for mobile
  const navigationItems: NavigationItem[] = [
    {
      id: "profile",
      icon: <User className="w-6 h-6" />,
      label: "Profil Pasien",
      description: "Informasi pribadi dan medis",
    },
    {
      id: "verification",
      icon: <CheckCircle className="w-6 h-6" />,
      label: "Status Verifikasi",
      description: "Verifikasi WhatsApp",
    },
    {
      id: "reminders",
      icon: <Bell className="w-6 h-6" />,
      label: "Pengingat",
      description: "Jadwal dan statistik",
    },
    {
      id: "responses",
      icon: <MessageSquare className="w-6 h-6" />,
      label: "Riwayat Respon",
      description: "Komunikasi pasien",
    },
  ];

  const fetchPatient = useCallback(
    async (id: string, isPolling = false) => {
      try {
        logger.info(`Fetching patient ${id}`, {
          isPolling,
          timestamp: new Date().toISOString(),
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`/api/patients/${id}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const responseJson = await response.json();
          const data = responseJson.data || responseJson; // Handle both old format and new createApiHandler format
          logger.info("Patient data fetched successfully", {
            patientId: id,
            hasName: !!data.name,
            responseFormat: responseJson.data ? "new" : "old",
          });

          // Check if verification status changed and show toast notification
          if (
            isPolling &&
            prevVerificationStatus.current &&
            prevVerificationStatus.current !== data.verificationStatus
          ) {
            const statusMessages: Record<string, string> = {
              verified: "✅ Pasien telah memverifikasi WhatsApp!",
              declined: "❌ Pasien menolak verifikasi WhatsApp",
              unsubscribed: "🛑 Pasien berhenti dari layanan",
            };

            const message =
              statusMessages[data.verificationStatus] ||
              `Status verifikasi diubah menjadi: ${data.verificationStatus}`;
            toast.success(message);
          }

          // Update previous status reference
          prevVerificationStatus.current = data.verificationStatus;

          setPatient(data);
          setError(null);
        } else if (response.status === 404 || response.status === 400) {
          // Invalid patient ID - redirect to 404
          if (!isPolling) {
            router.push("/404");
          }
          return;
        } else {
          logger.error("Failed to fetch patient data", undefined, {
            patientId: id,
            status: response.status,
            statusText: response.statusText,
          });
          setError("Gagal memuat data pasien");
        }
      } catch (error: unknown) {
        logger.error(
          "Error fetching patient:",
          error instanceof Error ? error : new Error(String(error))
        );
        setError("Terjadi kesalahan saat memuat data pasien");
      } finally {
        if (!isPolling) {
          setLoading(false);
        }
      }
    },
    [router]
  );

  const fetchReminderStats = useCallback(async (patientId: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/stats`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseJson = await response.json();
        const data = responseJson.data || responseJson; // Handle both formats
        setReminderStats(data);
      } else {
        logger.error("Failed to fetch reminder stats", undefined, {
          patientId,
          status: response.status,
          statusText: response.statusText,
        });
        setReminderStats(null);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching reminder stats",
        error instanceof Error ? error : new Error(String(error)),
        { patientId }
      );
      setReminderStats(null);
    }
  }, []);

  const fetchCompletedReminders = useCallback(async (patientId: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders?filter=completed`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseJson = await response.json();
        const data = responseJson.data || responseJson; // Handle both formats

        // Check if the endpoint is disabled
        if (data.disabled) {
          logger.warn("Completed reminders endpoint disabled", {
            patientId,
            reason: data.reason,
          });
          setCompletedReminders([]);
          return;
        }

        // Process the data if it's valid
        if (Array.isArray(data)) {
          setCompletedReminders(data);
        } else {
          logger.error(
            "Invalid response format for completed reminders",
            undefined,
            {
              patientId,
              dataType: typeof data,
              dataKeys: Object.keys(data || {}),
            }
          );
          setCompletedReminders([]);
        }
      } else {
        logger.error("Failed to fetch completed reminders", undefined, {
          patientId,
          status: response.status,
          statusText: response.statusText,
        });
        setCompletedReminders([]);
      }
    } catch (error: unknown) {
      logger.error(
        "Error fetching completed reminders",
        error instanceof Error ? error : new Error(String(error)),
        { patientId }
      );
      setCompletedReminders([]);
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
      fetchCompletedReminders(params.id as string);
      fetchReminderStats(params.id as string);
    }
  }, [params.id, fetchPatient, fetchCompletedReminders, fetchReminderStats]);

  // Smart polling for real-time verification status updates
  useEffect(() => {
    if (!params.id) return;

    let isPolling = false;
    let lastVersion: number | null = null;
    let pollCount = 0;
    const maxPollsPerSession = 50; // Allow more polls for better UX

    const pollVersion = async () => {
      if (isPolling) return;

      try {
        isPolling = true;
        pollCount++;

        // Poll lightweight version endpoint
        const response = await fetch(`/api/patients/${params.id}/version`);
        if (!response.ok) {
          logger.warn("Version polling failed", { status: response.status });
          return;
        }

        const responseJson = await response.json();
        const versionData = responseJson.data || responseJson;
        const currentVersion = versionData.version;

        // Check if version changed (patient data was updated)
        if (lastVersion !== null && lastVersion !== currentVersion) {
          logger.info("Patient data changed, refreshing...", {
            oldVersion: lastVersion,
            newVersion: currentVersion,
            oldStatus: patient?.verificationStatus,
            newStatus: versionData.verificationStatus,
          });

          // Immediately fetch full patient data
          await fetchPatient(params.id as string, true);
        }

        lastVersion = currentVersion;
      } catch (error) {
        logger.error(
          "Version polling error:",
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        isPolling = false;
      }
    };

    // Initial version fetch
    pollVersion();

    // Poll every 15 seconds when page is visible
    const pollInterval = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        pollCount < maxPollsPerSession
      ) {
        pollVersion();
      }
    }, 15000); // 15 seconds - much more responsive than 5 minutes

    return () => clearInterval(pollInterval);
  }, [params.id, fetchPatient, patient?.verificationStatus]);

  const handleAddReminder = () => {
    if (!patient) return;
    const allowed =
      patient.verificationStatus === "VERIFIED" && patient.isActive;
    if (!allowed) {
      toast.error("Pasien belum terverifikasi", {
        description:
          "Tambah pengingat dinonaktifkan sampai pasien menyetujui verifikasi WhatsApp.",
      });
      return;
    }
    setIsReminderModalOpen(true);
  };

  const handleViewReminders = () => {
    router.push(`/pengingat/pasien/${params.id}`);
  };

  const handleToggleStatus = () => {
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!patient) return;

    try {
      const endpoint = patient.isActive ? "deactivate" : "reactivate";
      const response = await fetch(`/api/patients/${params.id}/${endpoint}`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        await fetchPatient(params.id as string); // Refresh patient data
        toast.success(
          data.message ||
            `Pasien berhasil ${
              patient.isActive ? "dinonaktifkan" : "diaktifkan"
            }`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal mengubah status pasien");
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengubah status pasien");
    }
  };

  const handleReminderSuccess = () => {
    // Could add refresh logic here if needed
  };

  // Combined edit mode handlers

  const handleCancelProfile = () => {
    // Reset form data to original patient data
    setProfileForm({
      // Basic info
      name: patient?.name || "",
      phoneNumber: patient?.phoneNumber || "",
      address: patient?.address || "",
      birthDate: patient?.birthDate
        ? new Date(patient.birthDate).toISOString().split("T")[0]
        : "",
      diagnosisDate: patient?.diagnosisDate
        ? new Date(patient.diagnosisDate).toISOString().split("T")[0]
        : "",
      // Medical info
      cancerStage: patient?.cancerStage || "",
      doctorName: patient?.doctorName || "",
      hospitalName: patient?.hospitalName || "",
      emergencyContactName: patient?.emergencyContactName || "",
      emergencyContactPhone: patient?.emergencyContactPhone || "",
      notes: patient?.notes || "",
    });
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (photoData?: {
    file: File | null;
    shouldRemove: boolean;
  }) => {
    try {
      let photoUrl = patient?.photoUrl || null;

      // Handle photo operations
      if (photoData?.shouldRemove && patient?.photoUrl) {
        photoUrl = null; // Remove existing photo
      } else if (photoData?.file) {
        // Upload new photo
        const photoFormData = new FormData();
        photoFormData.append("photo", photoData.file);

        const photoResponse = await fetch("/api/upload?type=patient-photo", {
          method: "POST",
          body: photoFormData,
        });

        if (photoResponse.ok) {
          const photoDataResponse = await photoResponse.json();
          photoUrl = photoDataResponse.url;
        } else {
          toast.error("Gagal mengunggah foto profil");
          return;
        }
      }

      // Combined update data (all fields)
      const updateData = {
        // Basic info
        name: profileForm.name,
        phoneNumber: profileForm.phoneNumber,
        address: profileForm.address || null,
        birthDate: profileForm.birthDate || null,
        diagnosisDate: profileForm.diagnosisDate || null,
        photoUrl: photoUrl,
        // Medical info
        cancerStage: profileForm.cancerStage || null,
        doctorName: profileForm.doctorName || null,
        hospitalName: profileForm.hospitalName || null,
        emergencyContactName: profileForm.emergencyContactName || null,
        emergencyContactPhone: profileForm.emergencyContactPhone || null,
        notes: profileForm.notes || null,
      };

      const response = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedPatient = await response.json();
        setPatient(updatedPatient);
        setIsEditingProfile(false);
        toast.success("Profil pasien berhasil diperbarui");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui profil pasien");
      }
    } catch {
      toast.error("Gagal memperbarui profil pasien");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-5"
            style={{ backgroundImage: "url(/bg_desktop.png)" }}
          />
        </div>

        {/* Desktop: Header */}
        <div className="hidden lg:block relative z-10">
          <Header showNavigation={true} />
        </div>

        {/* Mobile: Header */}
        <div className="lg:hidden relative z-10">
          <header className="bg-white">
            <div className="flex justify-between items-center px-4 py-4">
              <button
                onClick={() => router.push("/pasien")}
                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </header>
        </div>

        <main className="relative z-10 pt-4 pb-12">
          <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8"></div>
        </main>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-5"
            style={{ backgroundImage: "url(/bg_desktop.png)" }}
          />
        </div>

        {/* Desktop: Header */}
        <div className="hidden lg:block relative z-10">
          <Header showNavigation={true} />
        </div>

        {/* Mobile: Header */}
        <div className="lg:hidden relative z-10">
          <header className="bg-white">
            <div className="flex justify-between items-center px-4 py-4">
              <button
                onClick={() => router.push("/pasien")}
                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </header>
        </div>
        <main className="relative z-10 py-12">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Card className="max-w-md">
                <CardContent className="p-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Terjadi Kesalahan
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Tidak dapat memuat data pasien. Silakan coba lagi.
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    Coba Lagi
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-5"
          style={{ backgroundImage: "url(/bg_desktop.png)" }}
        />
      </div>

      {/* Desktop: Header */}
      <div className="hidden lg:block relative z-10">
        <Header showNavigation={true} />
      </div>

      {/* Mobile: Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white">
          <div className="flex justify-between items-center px-4 py-4">
            <button
              onClick={() => router.push("/pasien")}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
      </div>

      <main className="relative z-10 pt-4 pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Patient Header Card */}
          {loading ? null : patient ? (
            <PatientHeaderCard
              patient={patient}
              onAddReminder={handleAddReminder}
              onViewReminders={handleViewReminders}
              onToggleStatus={handleToggleStatus}
            />
          ) : null}

          {/* Desktop: Tabs (hidden on mobile) */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="hidden lg:block space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="verification">Verifikasi</TabsTrigger>
              <TabsTrigger value="reminders">Pengingat</TabsTrigger>
              <TabsTrigger value="responses">Riwayat Respon</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <PatientProfileTabCombined
                patient={patient}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                handleSaveProfile={handleSaveProfile}
                handleCancelProfile={handleCancelProfile}
              />
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification">
              <PatientVerificationTab
                patient={patient}
                onUpdate={() => fetchPatient(params.id as string)}
              />
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders">
              <PatientRemindersTab
                patient={patient}
                completedReminders={completedReminders}
                reminderStats={reminderStats}
                onAddReminder={handleAddReminder}
                onViewReminders={handleViewReminders}
              />
            </TabsContent>

            {/* Response History Tab */}
            <TabsContent value="responses">
              <PatientResponseHistoryTab
                patientId={params.id as string}
                patientName={patient?.name || ""}
              />
            </TabsContent>
          </Tabs>

          {/* Mobile: Navigation Cards + Content (hidden on desktop) */}
          <div className="lg:hidden space-y-6">
            <NavigationCard
              items={navigationItems}
              activeItem={activeTab}
              onItemClick={setActiveTab}
            />

            {/* Content based on active item */}
            {activeTab === "profile" && (
              <PatientProfileTabCombined
                patient={patient}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                handleSaveProfile={handleSaveProfile}
                handleCancelProfile={handleCancelProfile}
              />
            )}
            {activeTab === "verification" && (
              <PatientVerificationTab
                patient={patient}
                onUpdate={() => fetchPatient(params.id as string)}
              />
            )}
            {activeTab === "reminders" && (
              <PatientRemindersTab
                patient={patient}
                completedReminders={completedReminders}
                reminderStats={reminderStats}
                onAddReminder={handleAddReminder}
                onViewReminders={handleViewReminders}
              />
            )}
            {activeTab === "responses" && (
              <PatientResponseHistoryTab
                patientId={params.id as string}
                patientName={patient?.name || ""}
              />
            )}
          </div>
        </div>
      </main>

      {/* Reminder Modal */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={handleReminderSuccess}
        patientName={patient?.name || "Pasien"}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title={patient?.isActive ? "Nonaktifkan Pasien" : "Aktifkan Pasien"}
        description={
          patient?.isActive
            ? `Apakah Anda yakin ingin menonaktifkan pasien ${
                patient?.name || "pasien ini"
              }? Semua pengingat akan dihentikan dan pasien akan menerima pesan WhatsApp konfirmasi.`
            : `Apakah Anda yakin ingin mengaktifkan kembali pasien ${
                patient?.name || "pasien ini"
              }? Pasien akan kembali ke status verifikasi awal.`
        }
        confirmText={patient?.isActive ? "Nonaktifkan" : "Aktifkan"}
        variant={patient?.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
