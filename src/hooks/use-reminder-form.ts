import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getCurrentTimeWIB, isTimeValidForSelectedDates } from "@/lib/datetime";

// Simplified patient type for form usage
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

// Extended CustomRecurrence for form state
interface CustomRecurrenceWithEnabled {
  enabled: boolean;
  frequency: "day" | "week" | "month";
  interval: number;
  daysOfWeek: number[]; // Different from API type which uses string[]
  daysOfMonth: number[];
  endType: "never" | "on" | "after";
  endDate: string;
  occurrences: number;
}

export function useReminderForm(onSuccess: () => void, onClose: () => void) {
  const params = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [formData, setFormData] = useState({
    message: "",
    time: getCurrentTimeWIB().split(':')[0] + ':00',
  });
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);

  const [customRecurrence, setCustomRecurrence] = useState<CustomRecurrenceWithEnabled>({
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
      fetchTemplates();
      // Reset form when opened
      setFormData({
        message: "",
        time: getCurrentTimeWIB().split(':')[0] + ':00',
      });
      setSelectedDates([]);
      setCustomRecurrence({
        enabled: false,
        frequency: "week",
        interval: 1,
        daysOfWeek: [],
        daysOfMonth: [],
        endType: "never",
        endDate: "",
        occurrences: 1,
      });
      setSelectedTemplate("");
      setSelectedContent([]);
    }
  }, [params.id]);

  const fetchPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setPatient({
          id: data.id,
          name: data.name,
          phoneNumber: data.phoneNumber,
        });
      }
    } catch {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setTemplates(data.templates || []);
      }
    } catch {
      // Silent error handling
    }
  };

  const convertNumbersToDayNames = (numbers: number[]): string[] => {
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return numbers.map((num) => dayNames[num]);
  };

  const handleDateChange = (dates: string[]) => {
    setSelectedDates(dates);
    if (dates.length > 0 && customRecurrence.enabled) {
      setCustomRecurrence((prev) => ({ ...prev, enabled: false }));
      toast.info(
        "Mode pengulangan kustom dinonaktifkan karena tanggal dipilih"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation: ensure only one scheduling mode is active
    if (customRecurrence.enabled && selectedDates.length > 0) {
      toast.error("Pilih salah satu: tanggal spesifik atau pengulangan kustom");
      return;
    }

    if (!customRecurrence.enabled && selectedDates.length === 0) {
      toast.error(
        "Pilih minimal satu tanggal atau aktifkan pengulangan kustom"
      );
      return;
    }

    // Validate time if specific dates are selected (not custom recurrence)
    if (!customRecurrence.enabled && selectedDates.length > 0) {
      const timeValidation = isTimeValidForSelectedDates(selectedDates, formData.time);
      if (!timeValidation.isValid) {
        toast.error(timeValidation.errorMessage || "Waktu pengingat tidak valid");
        return;
      }
    }

    if (customRecurrence.enabled) {
      // Custom recurrence validation
      if (
        customRecurrence.frequency === "week" &&
        customRecurrence.daysOfWeek.length === 0
      ) {
        toast.error("Pilih minimal satu hari untuk pengulangan mingguan");
        return;
      }
      if (
        customRecurrence.frequency === "month" &&
        customRecurrence.daysOfMonth.length === 0
      ) {
        toast.error("Pilih minimal satu tanggal untuk pengulangan bulanan");
        return;
      }
      if (customRecurrence.endType === "on" && !customRecurrence.endDate) {
        toast.error("Pilih tanggal berakhir untuk pengulangan");
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
          ? {
              customRecurrence: {
                frequency: customRecurrence.frequency,
                interval: customRecurrence.interval,
                daysOfWeek: convertNumbersToDayNames(
                  customRecurrence.daysOfWeek
                ),
                daysOfMonth: customRecurrence.daysOfMonth,
                endType: customRecurrence.endType,
                endDate: customRecurrence.endDate || null,
                occurrences: customRecurrence.occurrences,
              },
            }
          : {
              selectedDates: selectedDates,
            }),
      };

      const response = await fetch(`/api/patients/${params.id}/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Pengingat berhasil dibuat - ${
            result.count || 1
          } pengingat dijadwalkan`
        );
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal membuat pengingat");
      }
    } catch {
      toast.error("Gagal membuat pengingat");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    patient,
    loading,
    submitting,
    selectedDates,
    setSelectedDates: handleDateChange,
    isCustomRecurrenceOpen,
    setIsCustomRecurrenceOpen,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    formData,
    setFormData,
    selectedContent,
    setSelectedContent,
    customRecurrence,
    setCustomRecurrence,
    handleSubmit,
  };
}
