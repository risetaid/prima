"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";
import { PatientHeaderCard } from "@/components/patient/patient-header-card";
import { PatientProfileTab } from "@/components/patient/patient-profile-tab";
import { PatientHealthTab } from "@/components/patient/patient-health-tab";
import { PatientRemindersTab } from "@/components/patient/patient-reminders-tab";
import { PatientVerificationTab } from "@/components/patient/patient-verification-tab";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Patient as SchemaPatient } from "@/db/schema";
import { AlertTriangle } from "lucide-react";

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

interface HealthNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

interface ApiHealthNote {
  id: string;
  noteDate: string;
  note: string;
  createdAt: string;
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
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [completedReminders, setCompletedReminders] = useState<
    CompletedReminder[]
  >([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Edit mode states
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingMedicalInfo, setIsEditingMedicalInfo] = useState(false);

  // Form data states
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
    diagnosisDate: "",
  });

  const [medicalInfoForm, setMedicalInfoForm] = useState({
    cancerStage: "",
    doctorName: "",
    hospitalName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });

  // Ref to track previous verification status for toast notifications
  const prevVerificationStatus = useRef<string | null>(null);

  const fetchPatient = useCallback(async (id: string, isPolling = false) => {
    try {
      logger.info(`Fetching patient ${id}`, { isPolling, timestamp: new Date().toISOString() });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`/api/patients/${id}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

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
      } else {
        setError("Gagal memuat data pasien");
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
      setError("Terjadi kesalahan saat memuat data pasien");
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, []);

  const fetchHealthNotes = useCallback(async (patientId: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`/api/patients/${patientId}/health-notes`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const formattedNotes: HealthNote[] = data.healthNotes.map(
          (note: ApiHealthNote) => ({
            id: note.id,
            date: note.noteDate.split("T")[0],
            note: note.note,
            createdAt: note.createdAt,
          })
        );
        setHealthNotes(formattedNotes);
      } else if (response.status === 404) {
        setHealthNotes([]);
      } else {
        logger.error("Health notes fetch error", undefined, {
          patientId,
          status: response.status,
          statusText: response.statusText,
        });
        toast.error("Gagal memuat catatan kesehatan");
      }
    } catch (error) {
      logger.error("Health notes fetch error", error instanceof Error ? error : new Error(String(error)), { patientId });
      toast.error("Gagal memuat catatan kesehatan");
    }
  }, []);

  const fetchCompletedReminders = useCallback(async (patientId: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `/api/patients/${patientId}/reminders/completed`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Check if the endpoint is disabled
        if (data.disabled) {
          logger.warn("Completed reminders endpoint disabled", { patientId, reason: data.reason });
          setCompletedReminders([]);
          return;
        }

        // Process the data if it's valid
        if (Array.isArray(data)) {
          setCompletedReminders(data);
        } else {
          logger.error("Invalid response format for completed reminders", undefined, {
            patientId,
            dataType: typeof data,
            dataKeys: Object.keys(data || {})
          });
          setCompletedReminders([]);
        }
      } else {
        logger.error("Failed to fetch completed reminders", undefined, {
          patientId,
          status: response.status,
          statusText: response.statusText
        });
        setCompletedReminders([]);
      }
    } catch (error) {
      logger.error("Error fetching completed reminders", error instanceof Error ? error : new Error(String(error)), { patientId });
      setCompletedReminders([]);
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
      fetchHealthNotes(params.id as string);
      fetchCompletedReminders(params.id as string);
    }
  }, [params.id, fetchPatient, fetchHealthNotes, fetchCompletedReminders]);

  // Add polling for real-time verification updates (reduced frequency and added safeguards)
  useEffect(() => {
    if (!params.id) return;

    let pollCount = 0;
    const maxPollsPerSession = 3; // Reduced further to prevent excessive calls
    let isPolling = false; // Prevent concurrent polling requests

    const pollInterval = setInterval(() => {
      // Stop polling after maximum polls or if already polling
      if (pollCount >= maxPollsPerSession || isPolling) {
        if (pollCount >= maxPollsPerSession) {
          clearInterval(pollInterval);
        }
        return;
      }

      // Only poll if page is visible and patient status is pending
      if (
        document.visibilityState === "visible" &&
        patient?.verificationStatus === "PENDING"
      ) {
        isPolling = true;
        fetchPatient(params.id as string, true)
          .catch(error => {
            console.error("Polling failed:", error);
            // Stop polling on errors to prevent infinite retries
            if (pollCount >= 2) {
              clearInterval(pollInterval);
            }
          })
          .finally(() => {
            isPolling = false;
            pollCount++;
          });
      }
    }, 300000); // Increased to 5 minutes to be very conservative

    return () => clearInterval(pollInterval);
  }, [params.id, patient?.verificationStatus, fetchPatient]);

  const handleAddNote = async (note: string, date: string) => {
    try {
      const response = await fetch(`/api/patients/${params.id}/health-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), noteDate: date }),
      });

      if (response.ok) {
        const data = await response.json();
        const formattedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split("T")[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt,
        };
        setHealthNotes((prev) => [...prev, formattedNote]);
        toast.success("Catatan berhasil ditambahkan");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal menambahkan catatan");
      }
    } catch (error) {
      logger.error("Error adding health note", error instanceof Error ? error : new Error(String(error)), { patientId: params.id as string });
      toast.error("Gagal menambahkan catatan");
    }
  };

  const handleEditNote = async (noteId: string, note: string, date: string) => {
    try {
      const response = await fetch(
        `/api/patients/${params.id}/health-notes/${noteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim(), noteDate: date }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const updatedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split("T")[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt,
        };
        setHealthNotes((prev) =>
          prev.map((note) => (note.id === noteId ? updatedNote : note))
        );
        toast.success("Catatan berhasil diperbarui");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui catatan");
      }
    } catch {
      toast.error("Gagal memperbarui catatan");
    }
  };

  const handleDeleteSelectedNotes = async (noteIds: string[]) => {
    if (noteIds.length === 0) {
      toast.error("Pilih catatan yang akan dihapus");
      return;
    }

    try {
      const response = await fetch(
        `/api/patients/${params.id}/health-notes/bulk-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteIds }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHealthNotes((prev) =>
          prev.filter((note) => !noteIds.includes(note.id))
        );
        toast.success(
          data.message || `${noteIds.length} catatan berhasil dihapus`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal menghapus catatan");
      }
    } catch {
      toast.error("Gagal menghapus catatan");
    }
  };

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

  // Edit mode handlers

  const handleCancelBasicInfo = () => {
    setIsEditingBasicInfo(false);
  };

  const handleCancelMedicalInfo = () => {
    setIsEditingMedicalInfo(false);
  };

  const handleSaveBasicInfo = async () => {
    try {
      const updateData = {
        name: basicInfoForm.name,
        phoneNumber: basicInfoForm.phoneNumber,
        address: basicInfoForm.address || null,
        birthDate: basicInfoForm.birthDate || null,
        diagnosisDate: basicInfoForm.diagnosisDate || null,
      };

      const response = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedPatient = await response.json();
        setPatient(updatedPatient);
        setIsEditingBasicInfo(false);
        toast.success("Informasi dasar berhasil diperbarui");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui informasi dasar");
      }
    } catch {
      toast.error("Gagal memperbarui informasi dasar");
    }
  };

  const handleSaveMedicalInfo = async () => {
    try {
      const updateData = {
        cancerStage: medicalInfoForm.cancerStage || null,
        doctorName: medicalInfoForm.doctorName || null,
        hospitalName: medicalInfoForm.hospitalName || null,
        emergencyContactName: medicalInfoForm.emergencyContactName || null,
        emergencyContactPhone: medicalInfoForm.emergencyContactPhone || null,
        notes: medicalInfoForm.notes || null,
      };

      const response = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedPatient = await response.json();
        setPatient(updatedPatient);
        setIsEditingMedicalInfo(false);
        toast.success("Informasi medis berhasil diperbarui");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui informasi medis");
      }
    } catch {
      toast.error("Gagal memperbarui informasi medis");
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

        <Header showNavigation={true} />

        <main className="relative z-10 pt-4 pb-12">
          <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Patient Header Card Skeleton */}
            <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 bg-white/20" />
                      <Skeleton className="h-4 w-32 bg-white/20" />
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-5 w-16 rounded-full bg-white/20" />
                        <Skeleton className="h-5 w-20 rounded-full bg-white/20" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Skeleton className="h-10 w-32 rounded bg-white/10" />
                    <Skeleton className="h-10 w-36 rounded bg-white/10" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs Skeleton */}
            <Tabs value="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile" disabled>
                  Profil
                </TabsTrigger>
                <TabsTrigger value="health" disabled>
                  Kesehatan
                </TabsTrigger>
                <TabsTrigger value="reminders" disabled>
                  Pengingat
                </TabsTrigger>
                <TabsTrigger value="verification" disabled>
                  Verifikasi
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab Skeleton */}
              <TabsContent value="profile" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information Card Skeleton */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Skeleton className="w-5 h-5 rounded mr-2" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical Information Card Skeleton */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Skeleton className="w-5 h-5 rounded mr-2" />
                          <Skeleton className="h-5 w-40" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Patient Variables Skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
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
        <Header showNavigation={true} />
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

      <Header showNavigation={true} />

      <main className="relative z-10 pt-4 pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Patient Header Card */}
          <PatientHeaderCard
            patient={patient}
            onAddReminder={handleAddReminder}
            onViewReminders={handleViewReminders}
            onToggleStatus={handleToggleStatus}
          />

          {/* Main Content Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="health">Kesehatan</TabsTrigger>
              <TabsTrigger value="reminders">Pengingat</TabsTrigger>
              <TabsTrigger value="verification">Verifikasi</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <PatientProfileTab
                patient={patient}
                isEditingBasicInfo={isEditingBasicInfo}
                setIsEditingBasicInfo={setIsEditingBasicInfo}
                basicInfoForm={basicInfoForm}
                setBasicInfoForm={setBasicInfoForm}
                handleSaveBasicInfo={handleSaveBasicInfo}
                handleCancelBasicInfo={handleCancelBasicInfo}
                isEditingMedicalInfo={isEditingMedicalInfo}
                setIsEditingMedicalInfo={setIsEditingMedicalInfo}
                medicalInfoForm={medicalInfoForm}
                setMedicalInfoForm={setMedicalInfoForm}
                handleSaveMedicalInfo={handleSaveMedicalInfo}
                handleCancelMedicalInfo={handleCancelMedicalInfo}
                patientId={params.id as string}
              />
            </TabsContent>

            {/* Health Notes Tab */}
            <TabsContent value="health">
              <PatientHealthTab
                healthNotes={healthNotes}
                patientId={params.id as string}
                onAddNote={handleAddNote}
                onEditNote={handleEditNote}
                onDeleteNotes={handleDeleteSelectedNotes}
              />
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders">
              <PatientRemindersTab
                patient={patient}
                completedReminders={completedReminders}
                onAddReminder={handleAddReminder}
                onViewReminders={handleViewReminders}
              />
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification">
              <PatientVerificationTab
                patient={patient}
                onUpdate={() => fetchPatient(params.id as string)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Reminder Modal */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={handleReminderSuccess}
        patientName={patient.name}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title={patient?.isActive ? "Nonaktifkan Pasien" : "Aktifkan Pasien"}
        description={
          patient?.isActive
            ? `Apakah Anda yakin ingin menonaktifkan pasien ${patient.name}? Semua pengingat akan dihentikan dan pasien akan menerima pesan WhatsApp konfirmasi.`
            : `Apakah Anda yakin ingin mengaktifkan kembali pasien ${patient.name}? Pasien akan kembali ke status verifikasi awal.`
        }
        confirmText={patient?.isActive ? "Nonaktifkan" : "Aktifkan"}
        variant={patient?.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
