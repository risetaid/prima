"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getCurrentTimeWIB } from "@/lib/datetime";
import { toast } from "@/components/ui/toast";
import { ContentSelector } from "@/components/reminder/ContentSelector";
import { CustomRecurrenceModal } from "@/components/reminder/CustomRecurrenceModal";
import { MessageInput } from "@/components/reminder/MessageInput";
import { DateTimeSelector } from "@/components/reminder/DateTimeSelector";

interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
}

interface WhatsAppTemplate {
  id: string;
  templateName: string;
  templateText: string;
  variables: string[];
  category: "REMINDER" | "APPOINTMENT" | "EDUCATIONAL";
}

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  type: "article" | "video";
  thumbnailUrl?: string;
  url: string;
  excerpt?: string;
  videoUrl?: string;
  durationMinutes?: string;
}

interface CustomRecurrence {
  enabled: boolean;
  frequency: "day" | "week" | "month";
  interval: number;
  daysOfWeek: number[];
  daysOfMonth: number[];
  endType: "never" | "on" | "after";
  endDate: string;
  occurrences: number;
}

export default function AddReminderPage() {
  const router = useRouter();
  const params = useParams();

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false);

  // Data State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    message: "",
    time: getCurrentTimeWIB(),
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customRecurrence, setCustomRecurrence] = useState<CustomRecurrence>({
    enabled: false,
    frequency: "week",
    interval: 1,
    daysOfWeek: [],
    daysOfMonth: [],
    endType: "never",
    endDate: "",
    occurrences: 1,
  });

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
    }
    fetchTemplates();
  }, [params.id]);

  const fetchPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient({
          id: data.id,
          name: data.name,
          phoneNumber: data.phoneNumber,
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates"); // Remove category filter to get all templates
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!customRecurrence.enabled && selectedDates.length === 0) {
      toast.error("Pilih minimal satu tanggal", {
        description:
          "Anda harus memilih setidaknya satu tanggal untuk pengingat",
      });
      return;
    }

    if (customRecurrence.enabled) {
      if (
        customRecurrence.frequency === "week" &&
        customRecurrence.daysOfWeek.length === 0
      ) {
        toast.error("Pilih minimal satu hari", {
          description: "Untuk pengulangan mingguan, pilih setidaknya satu hari",
        });
        return;
      }
      if (customRecurrence.endType === "on" && !customRecurrence.endDate) {
        toast.error("Pilih tanggal berakhir", {
          description: "Tentukan tanggal berakhir untuk pengulangan",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const requestBody = {
        message: formData.message,
        time: formData.time,
        attachedContent: selectedContent.map((content) => ({
          id: content.id,
          title: content.title,
          type: content.type.toUpperCase() as "ARTICLE" | "VIDEO",
          slug: content.slug,
        })),
        ...(customRecurrence.enabled
          ? { customRecurrence }
          : { selectedDates }),
      };

      const response = await fetch(`/api/patients/${params.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Pengingat berhasil dibuat", {
          description: `${result.count || 1} pengingat telah dijadwalkan`,
        });
        router.back();
      } else {
        const error = await response.json();
        toast.error("Gagal membuat pengingat", {
          description: error.error || "Terjadi kesalahan pada server",
        });
      }
    } catch {
      toast.error("Gagal membuat pengingat", {
        description: "Terjadi kesalahan jaringan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Tambah Pengingat
            </h1>
            <UserButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-6">
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white">
        <div className="flex justify-between items-center px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-blue-600" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Input */}
          <MessageInput
            message={formData.message}
            onMessageChange={(message) => setFormData({ ...formData, message })}
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
            time={formData.time}
            selectedDates={selectedDates}
          />

          {/* Content Attachment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-500 text-sm">
                Lampirkan Konten Edukasi{" "}
                <span className="text-gray-400">(opsional)</span>
              </label>
              {selectedContent.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {selectedContent.length}/5 dipilih
                </span>
              )}
            </div>
            <ContentSelector
              selectedContent={selectedContent}
              onContentChange={setSelectedContent}
            />
          </div>

          {/* Date & Time Selection */}
          <DateTimeSelector
            time={formData.time}
            onTimeChange={(time) => setFormData({ ...formData, time })}
            selectedDates={selectedDates}
            onDateChange={setSelectedDates}
            customRecurrence={customRecurrence}
            onCustomRecurrenceChange={setCustomRecurrence}
            onOpenCustomRecurrence={() => setIsCustomRecurrenceOpen(true)}
          />

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
            >
              ✕ Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>▶</span>
              <span>{submitting ? "Loading..." : "Submit"}</span>
            </button>
          </div>
        </form>

        {/* Patient Info */}
        {patient && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Pasien:</strong> {patient.name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>WhatsApp:</strong> {patient.phoneNumber}
            </p>
          </div>
        )}
      </main>

      {/* Custom Recurrence Modal */}
      <CustomRecurrenceModal
        isOpen={isCustomRecurrenceOpen}
        onClose={() => setIsCustomRecurrenceOpen(false)}
        customRecurrence={customRecurrence}
        onRecurrenceChange={setCustomRecurrence}
        onApply={() => {
          setCustomRecurrence((prev) => ({ ...prev, enabled: true }));
          setIsCustomRecurrenceOpen(false);
        }}
      />
    </div>
  );
}
