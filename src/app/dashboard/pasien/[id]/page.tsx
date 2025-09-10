"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Edit,
  Trash2,
  User,
  ChevronRight,
  Camera,
  Upload,
  X,
  Plus,
  ChevronLeft,
  Calendar,
  MessageSquare,
  Clock,
  Repeat,
  ChevronDown,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Header } from "@/components/ui/header";
import { formatDateWIB, formatDateTimeWIB } from "@/lib/datetime";
import Image from "next/image";
import { toast } from "sonner";
import { getCurrentTimeWIB } from "@/lib/datetime";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { PatientVariablesManager } from "@/components/patient/patient-variables-manager";
import { PatientDetailSkeleton } from "@/components/ui/dashboard-skeleton";
import VerificationBadge, {
  getVerificationStatusTitle,
  getVerificationStatusDescription,
} from "@/components/patient/verification-badge";
import VerificationActionsPanel from "@/components/patient/verification-actions-panel";
import VerificationInfoPanel from "@/components/patient/verification-info-panel";
import VerificationHistory from "@/components/patient/verification-history";
import VerificationStatusIcon from "@/components/patient/verification-status-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddReminderModal } from "@/components/pengingat/add-reminder-modal";

interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  address?: string;
  birthDate?: string;
  diagnosisDate?: string;
  cancerStage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  photoUrl?: string;
  complianceRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Verification fields
  verificationStatus: string;
  verificationSentAt?: string;
  verificationResponseAt?: string;
  verificationMessage?: string;
  verificationAttempts?: string;
  verificationExpiresAt?: string;
  // Volunteer/Manager fields
  assignedVolunteerId?: string;
  assignedVolunteer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };
  // Legacy individual fields (kept for backward compatibility)
  volunteerId?: string;
  volunteerFirstName?: string;
  volunteerLastName?: string;
  volunteerEmail?: string;
  volunteerRole?: string;
}

interface HealthNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

interface WhatsAppTemplate {
  id: string;
  templateName: string;
  templateText: string;
  variables: string[];
  category: "REMINDER" | "APPOINTMENT" | "EDUCATIONAL";
}

interface AutoFillData {
  nama: string;
  nomor: string;
  obat?: string;
  dosis?: string;
  dokter?: string;
  rumahSakit?: string;
  volunteer: string;
  waktu?: string;
  tanggal?: string;
  dataContext?: {
    hasActiveMedications: boolean;
    hasRecentReminders: boolean;
    hasMedicalRecords: boolean;
    assignedVolunteerName?: string;
    currentUserName?: string;
  };
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    phoneNumber: "",
    photoUrl: "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<HealthNote | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [editSelectedDate, setEditSelectedDate] = useState("");
  const [editCurrentMonth, setEditCurrentMonth] = useState(new Date());
  const [showEditCalendar, setShowEditCalendar] = useState(false);

  // Simple Reminder Modal State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  
  // Ref to track previous verification status for toast notifications
  const prevVerificationStatus = useRef<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
      fetchHealthNotes(params.id as string);
    }
  }, [params.id]);

  // Add polling for real-time verification updates
  useEffect(() => {
    if (!params.id) return;

    // Poll every 10 seconds when page is visible and patient is in pending verification
    const pollInterval = setInterval(() => {
      // Only poll if document is visible and patient is waiting for verification
      if (document.visibilityState === 'visible' && patient?.verificationStatus === 'pending_verification') {
        fetchPatient(params.id as string, true); // true = isPolling
      }
    }, 10000); // 10 seconds

    return () => clearInterval(pollInterval);
  }, [params.id, patient?.verificationStatus]);

  const fetchPatient = async (id: string, isPolling = false) => {
    try {
      const response = await fetch(`/api/patients/${id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if verification status changed and show toast notification
        if (isPolling && prevVerificationStatus.current && 
            prevVerificationStatus.current !== data.verificationStatus) {
          const statusMessages: Record<string, string> = {
            'verified': '✅ Pasien telah memverifikasi WhatsApp!',
            'declined': '❌ Pasien menolak verifikasi WhatsApp',
            'unsubscribed': '🛑 Pasien berhenti dari layanan'
          };
          
          const message = statusMessages[data.verificationStatus] || `Status verifikasi diubah menjadi: ${data.verificationStatus}`;
          toast.success(message);
        }
        
        // Update previous status reference
        prevVerificationStatus.current = data.verificationStatus;
        
        setPatient(data);
        setEditData({
          name: data.name,
          phoneNumber: data.phoneNumber,
          photoUrl: data.photoUrl || "",
        });
        setError(null);
      } else {
        setError("Gagal memuat data pasien");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat memuat data pasien");
    } finally {
      // Only set loading to false if this isn't a polling refresh
      if (!isPolling) {
        setLoading(false);
      }
    }
  };

  const fetchHealthNotes = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/health-notes`);
      if (response.ok) {
        const data = await response.json();
        // Convert API response to match frontend interface
        const formattedNotes: HealthNote[] = data.healthNotes.map(
          (note: any) => ({
            id: note.id,
            date: note.noteDate.split("T")[0], // Extract date part
            note: note.note,
            createdAt: note.createdAt,
          })
        );
        setHealthNotes(formattedNotes);
      } else if (response.status === 404) {
        // Patient not found or no health notes - set empty array silently
        setHealthNotes([]);
      } else {
        // Only show error for non-404 errors
        console.error(
          "Health notes fetch error:",
          response.status,
          response.statusText
        );
        toast.error("Gagal memuat catatan kesehatan");
      }
    } catch (error) {
      console.error("Health notes fetch error:", error);
      toast.error("Gagal memuat catatan kesehatan");
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error("Catatan tidak boleh kosong");
      return;
    }

    try {
      const response = await fetch(`/api/patients/${params.id}/health-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: newNoteText.trim(),
          noteDate: selectedDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add new note to the beginning of the list
        const formattedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split("T")[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt,
        };

        setHealthNotes((prev) => [formattedNote, ...prev]);
        setNewNoteText("");
        setSelectedDate(new Date().toISOString().split("T")[0]);
        setIsAddNoteModalOpen(false);
        toast.success("Catatan berhasil ditambahkan");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal menambahkan catatan");
      }
    } catch (error) {
      console.error("Error adding health note:", error);
      toast.error("Gagal menambahkan catatan");
    }
  };

  const handleEditNote = (note: HealthNote) => {
    setEditingNote(note);
    setEditNoteText(note.note);
    setEditSelectedDate(note.date);
    setEditCurrentMonth(new Date(note.date));
    setShowEditCalendar(false);
    setIsEditNoteModalOpen(true);
  };

  const handleSaveEditNote = async () => {
    if (!editNoteText.trim()) {
      toast.error("Catatan tidak boleh kosong");
      return;
    }

    if (!editingNote) return;

    try {
      const response = await fetch(
        `/api/patients/${params.id}/health-notes/${editingNote.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            note: editNoteText.trim(),
            noteDate: editSelectedDate,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update the note in the list
        const updatedNote: HealthNote = {
          id: data.healthNote.id,
          date: data.healthNote.noteDate.split("T")[0],
          note: data.healthNote.note,
          createdAt: data.healthNote.createdAt,
        };

        setHealthNotes((prev) =>
          prev.map((note) => (note.id === editingNote.id ? updatedNote : note))
        );

        setIsEditNoteModalOpen(false);
        setEditingNote(null);
        setEditNoteText("");
        setEditSelectedDate("");
        setShowEditCalendar(false);
        toast.success("Catatan berhasil diperbarui");
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal memperbarui catatan");
      }
    } catch (error) {
      toast.error("Gagal memperbarui catatan");
    }
  };

  const handleDeleteSelectedNotes = async () => {
    if (selectedNotes.length === 0) {
      toast.error("Pilih catatan yang akan dihapus");
      return;
    }

    try {
      const response = await fetch(
        `/api/patients/${params.id}/health-notes/bulk-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteIds: selectedNotes,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Remove deleted notes from the list
        setHealthNotes((prev) =>
          prev.filter((note) => !selectedNotes.includes(note.id))
        );
        setSelectedNotes([]);
        setIsDeleteMode(false);
        toast.success(
          data.message || `${selectedNotes.length} catatan berhasil dihapus`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal menghapus catatan");
      }
    } catch (error) {
      toast.error("Gagal menghapus catatan");
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateString = new Date(year, month, day).toISOString().split("T")[0];
    setSelectedDate(dateString);
    setShowCalendar(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Edit modal calendar functions
  const getEditCalendarDays = () => {
    const year = editCurrentMonth.getFullYear();
    const month = editCurrentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleEditDateClick = (day: number) => {
    const year = editCurrentMonth.getFullYear();
    const month = editCurrentMonth.getMonth();
    const dateString = new Date(year, month, day).toISOString().split("T")[0];
    setEditSelectedDate(dateString);
    setShowEditCalendar(false);
  };

  const navigateEditMonth = (direction: "prev" | "next") => {
    setEditCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

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

  const handleEdit = () => {
    if (isEditMode) {
      handleSave();
    } else {
      setIsEditMode(true);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (patient) {
      setEditData({
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        photoUrl: patient.photoUrl || "",
      });
    }
  };

  const handleSave = async () => {
    if (!patient) return;

    try {
      let photoUrl = patient.photoUrl;

      // Upload photo if a new one is selected
      if (selectedPhoto) {
        const formData = new FormData();
        formData.append("photo", selectedPhoto);
        formData.append("patientId", patient.id);

        const photoResponse = await fetch("/api/upload/patient-photo", {
          method: "POST",
          body: formData,
        });

        if (photoResponse.ok) {
          const photoData = await photoResponse.json();
          photoUrl = photoData.url;
        } else {
          console.error("Photo upload failed:", photoResponse.status);
          toast.error("Gagal Upload Foto", {
            description:
              "Foto tidak dapat diupload. Data lain akan tetap disimpan.",
          });
        }
      }

      const response = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editData.name,
          phoneNumber: editData.phoneNumber,
          address: patient.address,
          birthDate: patient.birthDate,
          diagnosisDate: patient.diagnosisDate,
          cancerStage: patient.cancerStage,
          emergencyContactName: patient.emergencyContactName,
          emergencyContactPhone: patient.emergencyContactPhone,
          notes: patient.notes,
          isActive: patient.isActive,
          photoUrl: selectedPhoto
            ? photoUrl
            : editData.photoUrl === ""
            ? null
            : editData.photoUrl,
        }),
      });

      if (response.ok) {
        const updatedPatient = await response.json();
        setPatient(updatedPatient);
        setIsEditMode(false);
        setSelectedPhoto(null);
        setPhotoPreview(null);
        toast.success("Berhasil Disimpan", {
          description: "Data pasien telah diperbarui.",
        });
      } else {
        toast.error("Gagal Menyimpan", {
          description:
            "Tidak dapat menyimpan perubahan data pasien. Coba lagi.",
        });
      }
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Kesalahan Jaringan", {
        description:
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      });
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setEditData({ ...editData, photoUrl: "" });
  };

  const handleSymptomsClick = () => {
    router.push(`/dashboard/pasien/${params.id}/gejala`);
  };

  const handleToggleStatus = async () => {
    if (!patient) return;

    const action = patient.isActive ? "nonaktifkan" : "aktifkan";
    const actionTitle = patient.isActive ? "Nonaktifkan" : "Aktifkan";

    // Show confirmation toast
    const confirmed = await new Promise<boolean>((resolve) => {
      toast.warning(`${actionTitle} ${patient.name}?`, {
        description: `Pasien akan di${action} dan ${
          patient.isActive
            ? "tidak muncul di daftar"
            : "muncul kembali di daftar"
        }.`,
        action: {
          label: actionTitle,
          onClick: () => resolve(true),
        },
        cancel: {
          label: "Batal",
          onClick: () => resolve(false),
        },
        duration: 10000,
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...patient,
          isActive: !patient.isActive,
        }),
      });

      if (response.ok) {
        const updatedPatient = await response.json();
        setPatient(updatedPatient);
        toast.success(`Pasien ${action}`, {
          description: `${patient.name} berhasil di${action}.`,
        });
      } else {
        const error = await response.json();
        toast.error(`Gagal ${actionTitle}`, {
          description: `Error: ${
            error.error || "Terjadi kesalahan pada server"
          }`,
        });
      }
    } catch (error) {
      console.error("Error toggling patient status:", error);
      toast.error("Kesalahan Jaringan", {
        description:
          "Tidak dapat mengubah status pasien. Periksa koneksi internet Anda.",
      });
    }
  };

  // Simplified Reminder Functions
  const handleAddReminder = () => {
    setIsReminderModalOpen(true);
  };

  const handleViewReminders = () => {
    router.push(`/dashboard/pengingat/pasien/${params.id}`);
  };

  const handleReminderSuccess = () => {
    // Could add any additional refresh logic here if needed
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url(/bg_desktop.png)",
            }}
          />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block relative z-10">
          <Header showNavigation={true} />
        </div>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pasien...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showNavigation={true} />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              Terjadi kesalahan memuat data pasien
            </p>
            <button
              onClick={() => window.location.reload()}
              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Coba Lagi
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Return loading if patient data is still null but not in error state
  if (!patient && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showNavigation={true} />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pasien...</p>
          </div>
        </main>
      </div>
    );
  }

  // Main return for successful patient data load - patient is guaranteed to be non-null here
  if (!patient) return null; // This should never happen but satisfies TypeScript

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Responsive Header */}
      <Header showNavigation={true} />



       {/* Main Content */}
       <main className="px-4 lg:px-8 py-4 relative z-10 space-y-6">
        {/* Patient Profile Section - Full Width */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">
                    Profil Pasien
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base">
                    Informasi lengkap dan pengelolaan data pasien
                  </p>
                </div>
              </div>
            </div>

            {/* Managed by information */}
            {patient.assignedVolunteer && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                   <div className="flex items-center space-x-2 text-blue-100 mb-1">
                     <User className="w-4 h-4" />
                     <span className="text-sm font-medium">Dikelola oleh</span>
                   </div>
                  <div className="text-white">
                    <div className="font-semibold">
                      {patient.volunteerFirstName} {patient.volunteerLastName}
                    </div>
                    <div className="text-xs text-blue-100 mt-1">
                      <span className="font-medium">
                        {patient.volunteerEmail}
                      </span>
                      {patient.volunteerRole && (
                        <>
                          {" • "}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              patient.volunteerRole === "SUPERADMIN"
                                ? "bg-red-500/20 text-red-100 border border-red-400/30"
                                : patient.volunteerRole === "ADMIN"
                                ? "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30"
                                : "bg-green-500/20 text-green-100 border border-green-400/30"
                            }`}
                          >
                            {patient.volunteerRole === "SUPERADMIN"
                              ? "Super Admin"
                              : patient.volunteerRole === "ADMIN"
                              ? "Admin"
                              : "Member"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Content - Responsive Grid Layout */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column: Basic Info & Photo */}
              <div className="lg:col-span-1 space-y-6">
                {/* Profile Picture */}
                <div className="flex justify-center relative">
                  {photoPreview || patient.photoUrl ? (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg relative">
                      <Image
                        src={photoPreview || patient.photoUrl!}
                        alt={patient.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                      {isEditMode && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                          <label
                            htmlFor="photo-upload"
                            className="cursor-pointer"
                          >
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`w-24 h-24 sm:w-32 sm:h-32 ${getRandomAvatarColor(
                        patient.name
                      )} rounded-full flex items-center justify-center relative shadow-lg border-4 border-white`}
                    >
                      <span className="text-white font-bold text-xl sm:text-3xl">
                        {getInitials(patient.name)}
                      </span>
                      {isEditMode && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <label
                            htmlFor="photo-upload"
                            className="cursor-pointer"
                          >
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditMode && (
                    <>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <div className="absolute -bottom-2 flex space-x-2">
                        <button
                          onClick={() =>
                            document.getElementById("photo-upload")?.click()
                          }
                          className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors cursor-pointer shadow-md"
                          title="Upload Foto"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        {(photoPreview || patient.photoUrl) && (
                          <button
                            onClick={handleRemovePhoto}
                            className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors cursor-pointer shadow-md"
                            title="Hapus Foto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Basic Patient Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2 font-medium">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        isEditMode &&
                        setEditData({ ...editData, name: e.target.value })
                      }
                      readOnly={!isEditMode}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 font-medium transition-all ${
                        isEditMode
                          ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white shadow-sm"
                          : "border-gray-200 bg-gray-50 cursor-default"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 text-sm mb-2 font-medium">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editData.phoneNumber}
                      onChange={(e) =>
                        isEditMode &&
                        setEditData({
                          ...editData,
                          phoneNumber: e.target.value,
                        })
                      }
                      readOnly={!isEditMode}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 font-medium transition-all ${
                        isEditMode
                          ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white shadow-sm"
                          : "border-gray-200 bg-gray-50 cursor-default"
                      }`}
                    />
                  </div>

                  {/* Patient Status Badge */}
                  <div>
                    <label className="block text-gray-600 text-sm mb-2 font-medium">
                      Status
                    </label>
                    <div
                      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                        patient.isActive
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          patient.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      {patient.isActive ? "Aktif" : "Nonaktif"}
                    </div>
                  </div>

                  {/* Compliance Rate Display */}
                  <div>
                    <label className="block text-gray-600 text-sm mb-2 font-medium">
                      Tingkat Kepatuhan
                    </label>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${patient.complianceRate}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {patient.complianceRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="cursor-pointer w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 shadow-sm border border-gray-200"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleEdit}
                        className="cursor-pointer w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                      >
                        Simpan Perubahan
                      </button>
                    </>
                  ) : (
                    <>
                       <button
                         onClick={handleEdit}
                         className="cursor-pointer w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                       >
                        <Edit className="w-5 h-5" />
                        <span>Edit Profil</span>
                      </button>

                       <button
                         onClick={handleToggleStatus}
                         className={`cursor-pointer w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg ${
                           patient.isActive
                             ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                             : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                         }`}
                       >
                        {patient.isActive ? (
                          <>
                            <User className="w-5 h-5" />
                            <span>Nonaktifkan</span>
                          </>
                        ) : (
                          <>
                            <User className="w-5 h-5" />
                            <span>Aktifkan</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Center & Right: Patient Management Features */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                {!isEditMode && (
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 rounded-2xl border border-blue-200 shadow-sm">
                    <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <span>Aksi Cepat</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                       <button
                         onClick={handleAddReminder}
                         className="cursor-pointer bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 sm:space-x-3 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                       >
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          Buat Pengingat
                        </span>
                      </button>
                       <button
                         onClick={handleViewReminders}
                         className="cursor-pointer bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 sm:space-x-3 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                       >
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          Lihat Pengingat
                        </span>
                      </button>
                    </div>
                    {/* Tips */}
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs sm:text-sm text-gray-600 text-center">
                        💡 <strong>Tips:</strong> Gunakan "Buat Pengingat" untuk
                        sistem auto-fill dengan template WhatsApp
                      </p>
                    </div>
                  </div>
                )}

                {/* Patient Variables */}
                {!isEditMode && (
                  <PatientVariablesManager
                    patientId={
                      Array.isArray(params.id) ? params.id[0] : params.id!
                    }
                    patientName={patient?.name || "Pasien"}
                  />
                )}

                {/* Statistics */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <span>Statistik Kepatuhan</span>
                  </h4>

                  {/* Compliance Rate Display */}
                  <div className="text-center mb-6">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">
                      {patient.complianceRate}%
                    </div>
                    <p className="text-sm text-gray-600">
                      Tingkat Kepatuhan Pasien
                    </p>
                  </div>

                  {/* Chart Visualization */}
                  <div className="flex justify-center items-end space-x-1 h-24 bg-white rounded-lg p-4">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-purple-500 to-purple-400 rounded-t w-4 sm:w-6 transition-all duration-300"
                        style={{
                          height: `${Math.max(
                            20,
                            Math.random() * 60 + patient.complianceRate / 2
                          )}px`,
                          opacity: 0.7 + Math.random() * 0.3,
                        }}
                        title={`Bulan ${i + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Performa 12 bulan terakhir
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Verification Section */}
        {patient && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Verifikasi WhatsApp
                  </h2>
                  <p className="text-green-100 text-sm sm:text-base">
                    Status dan pengelolaan verifikasi pasien
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Status Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <VerificationStatusIcon
                      status={patient.verificationStatus}
                    />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Status Verifikasi
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {getVerificationStatusDescription(
                        patient.verificationStatus,
                        patient.isActive
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <VerificationBadge
                    status={
                      patient.verificationStatus as
                        | "pending_verification"
                        | "verified"
                        | "declined"
                        | "expired"
                        | "unsubscribed"
                    }
                    size="large"
                    patient={patient}
                  />
                </div>
              </div>

              {/* Verification Details Grid - Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200">
                  <div className="text-xs sm:text-sm font-medium text-green-600 mb-1">
                    Status
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900">
                    {getVerificationStatusTitle(
                      patient.verificationStatus,
                      patient.isActive
                    )}
                  </div>
                </div>

                {patient.verificationSentAt && (
                  <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
                    <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">
                      Terkirim
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                      {formatDateTimeWIB(new Date(patient.verificationSentAt))}
                    </div>
                  </div>
                )}

                {patient.verificationResponseAt && (
                  <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-200">
                    <div className="text-xs sm:text-sm font-medium text-purple-600 mb-1">
                      Direspon
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                      {formatDateTimeWIB(
                        new Date(patient.verificationResponseAt)
                      )}
                    </div>
                  </div>
                )}

                {patient.verificationAttempts &&
                  parseInt(patient.verificationAttempts) > 0 && (
                    <div className="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-200">
                      <div className="text-xs sm:text-sm font-medium text-orange-600 mb-1">
                        Percobaan
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-gray-900">
                        {patient.verificationAttempts}x
                      </div>
                    </div>
                  )}
              </div>

              {/* Actions Panel */}
              <div className="mb-6">
                <VerificationActionsPanel
                  patient={patient}
                  onUpdate={() => fetchPatient(params.id as string)}
                />
              </div>

              {/* Verification History */}
              <div className="border-t border-gray-200 pt-6">
                <VerificationHistory patientId={patient.id} />
              </div>
            </div>
          </div>
        )}

        {/* Health Notes Section - Full Width */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Health Notes Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Catatan Kesehatan
                </h2>
                <p className="text-purple-100 text-sm sm:text-base">
                  Riwayat dan catatan kondisi pasien
                </p>
              </div>
            </div>
          </div>

          {/* Health Notes Content */}
          <div className="p-4 sm:p-6">
            <div className="">
              {healthNotes.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <Edit className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-30 text-purple-300" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                    Belum ada catatan kesehatan
                  </h3>
                  <p className="text-xs sm:text-sm">
                    Klik "Tambah Catatan" untuk menambah catatan pertama
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {healthNotes.map((note, index) => (
                    <div
                      key={note.id}
                      className="group bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-3 sm:p-4 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {isDeleteMode && (
                          <input
                            type="checkbox"
                            checked={selectedNotes.includes(note.id)}
                            onChange={() => toggleNoteSelection(note.id)}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 rounded focus:ring-purple-500 mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        {/* Note Number Badge */}
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                          {healthNotes.length - index}
                        </div>

                        {/* Note Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                                {note.note}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatNoteDate(note.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Dibuat{" "}
                                  {formatDateTimeWIB(new Date(note.createdAt))}
                                </span>
                              </div>
                            </div>

                            {/* Edit Button */}
                            {!isDeleteMode && (
                              <button
                                onClick={() => handleEditNote(note)}
                                className="cursor-pointer flex-shrink-0 p-2 text-purple-600 hover:bg-purple-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                                title="Edit catatan"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Health Notes Footer */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
               <button
                 onClick={() => {
                   setIsAddNoteModalOpen(true);
                   setNewNoteText("");
                   setSelectedDate(new Date().toISOString().split("T")[0]);
                   setCurrentMonth(new Date());
                   setShowCalendar(false);
                 }}
                 className="flex-1 bg-white text-purple-600 px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
               >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">
                  Tambah Catatan Kesehatan
                </span>
              </button>
               <button
                 onClick={() => {
                   if (isDeleteMode && selectedNotes.length > 0) {
                     handleDeleteSelectedNotes();
                   } else {
                     setIsDeleteMode(!isDeleteMode);
                     setSelectedNotes([]);
                   }
                 }}
                 className={`px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl ${
                   isDeleteMode && selectedNotes.length > 0
                     ? "bg-red-600 text-white hover:bg-red-700"
                     : isDeleteMode
                     ? "bg-gray-600 text-white hover:bg-gray-700"
                     : "bg-red-500 text-white hover:bg-red-600"
                 }`}
               >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">
                  {isDeleteMode && selectedNotes.length > 0
                    ? `Hapus ${selectedNotes.length}`
                    : isDeleteMode
                    ? "Batal"
                    : "Hapus"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add Health Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Catatan Kesehatan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-gray-500 text-sm mb-2">
                Catatan
              </label>
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Contoh: Gatal-gatal, efek samping obat"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Picker */}
            <div className="mb-6">
              <label className="block text-gray-500 text-sm mb-2">
                Tanggal
              </label>

              {!showCalendar ? (
                <button
                  onClick={() => setShowCalendar(true)}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-blue-500 font-medium text-center hover:bg-blue-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {formatNoteDate(selectedDate)}
                </button>
              ) : (
                <div className="border-2 border-blue-200 rounded-xl p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth("prev")}
                      className="cursor-pointer p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h4 className="text-lg font-semibold text-blue-500">
                      {currentMonth.toLocaleDateString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>
                    <button
                      onClick={() => navigateMonth("next")}
                      className="cursor-pointer p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["M", "S", "S", "R", "K", "J", "S"].map((day, index) => (
                      <div
                        key={index}
                        className="p-2 text-sm font-medium text-gray-500"
                      >
                        {day}
                      </div>
                    ))}

                    {getCalendarDays().map((day, index) => (
                      <div key={index} className="p-2">
                        {day && (
                          <button
                            onClick={() => handleDateClick(day)}
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors cursor-pointer ${
                              selectedDate ===
                              new Date(
                                currentMonth.getFullYear(),
                                currentMonth.getMonth(),
                                day
                              )
                                .toISOString()
                                .split("T")[0]
                                ? "bg-blue-500 text-white"
                                : "text-blue-500 hover:bg-blue-50"
                            }`}
                          >
                            {day}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddNoteModalOpen(false);
                setNewNoteText("");
                setSelectedDate(new Date().toISOString().split("T")[0]);
                setShowCalendar(false);
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleAddNote} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Health Note Modal */}
      <Dialog
        open={isEditNoteModalOpen && editingNote !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditNoteModalOpen(false);
            setEditingNote(null);
            setEditNoteText("");
            setEditSelectedDate("");
            setShowEditCalendar(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Catatan Kesehatan Pasien</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-gray-500 text-sm mb-2">
                Catatan
              </label>
              <input
                type="text"
                value={editNoteText}
                onChange={(e) => setEditNoteText(e.target.value)}
                placeholder="Contoh: Gatal-gatal, efek samping obat"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Picker for Edit */}
            <div className="mb-6">
              <label className="block text-gray-500 text-sm mb-2">
                Tanggal
              </label>

              {!showEditCalendar ? (
                <button
                  onClick={() => setShowEditCalendar(true)}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-blue-500 font-medium text-center hover:bg-blue-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {formatNoteDate(editSelectedDate)}
                </button>
              ) : (
                <div className="border-2 border-blue-200 rounded-xl p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateEditMonth("prev")}
                      className="cursor-pointer p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h4 className="text-lg font-semibold text-blue-500">
                      {editCurrentMonth.toLocaleDateString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>
                    <button
                      onClick={() => navigateEditMonth("next")}
                      className="cursor-pointer p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["M", "S", "S", "R", "K", "J", "S"].map((day, index) => (
                      <div
                        key={index}
                        className="p-2 text-sm font-medium text-gray-500"
                      >
                        {day}
                      </div>
                    ))}

                    {getEditCalendarDays().map((day, index) => (
                      <div key={index} className="p-2">
                        {day && (
                          <button
                            onClick={() => handleEditDateClick(day)}
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors cursor-pointer ${
                              editSelectedDate ===
                              new Date(
                                editCurrentMonth.getFullYear(),
                                editCurrentMonth.getMonth(),
                                day
                              )
                                .toISOString()
                                .split("T")[0]
                                ? "bg-blue-500 text-white"
                                : "text-blue-500 hover:bg-blue-50"
                            }`}
                          >
                            {day}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditNoteModalOpen(false);
                setEditingNote(null);
                setEditNoteText("");
                setEditSelectedDate("");
                setShowEditCalendar(false);
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveEditNote} className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Modal */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={handleReminderSuccess}
        patientName={patient?.name || ""}
      />
    </div>
  );
}
