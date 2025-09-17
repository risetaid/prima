"use client";

import React, { useState } from "react";
import { X, Pill, AlertCircle, Info } from "lucide-react";
import { ContentSelector } from "./ContentSelector";
import { TimePicker24h } from "@/components/ui/time-picker-24h";
import { toast } from "@/components/ui/toast";
import {
  MedicationDetails,
  MedicationParser,
  MedicationDetailsSchema
} from "@/lib/medication-parser";

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
  order?: number;
}

interface ScheduledReminder {
  id: string;
  scheduledTime: string;
  nextReminderDate: string;
  customMessage?: string;
  attachedContent?: ContentItem[];
  medicationDetails?: MedicationDetails;
}

interface EditReminderModalProps {
  isOpen: boolean;
  reminder: ScheduledReminder | null;
  onClose: () => void;
  onSave: (time: string, message: string, content: ContentItem[], medication?: MedicationDetails) => Promise<void>;
  formatDate: (dateString: string) => string;
}

const MEDICATION_CATEGORIES = [
  { value: 'CHEMOTHERAPY', label: 'Kemoterapi' },
  { value: 'TARGETED_THERAPY', label: 'Terapi Target' },
  { value: 'IMMUNOTHERAPY', label: 'Imunoterapi' },
  { value: 'HORMONAL_THERAPY', label: 'Terapi Hormonal' },
  { value: 'PAIN_MANAGEMENT', label: 'Pengelolaan Nyeri' },
  { value: 'ANTIEMETIC', label: 'Antiemetik' },
  { value: 'ANTIBIOTIC', label: 'Antibiotik' },
  { value: 'ANTIVIRAL', label: 'Antiviral' },
  { value: 'ANTIFUNGAL', label: 'Antijamur' },
  { value: 'SUPPLEMENT', label: 'Suplemen' },
  { value: 'OTHER', label: 'Lainnya' },
];

const MEDICATION_FORMS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Kapsul' },
  { value: 'LIQUID', label: 'Cairan' },
  { value: 'INJECTION', label: 'Injeksi' },
  { value: 'INFUSION', label: 'Infus' },
  { value: 'CREAM', label: 'Krim' },
  { value: 'PATCH', label: 'Plester' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'SPRAY', label: 'Semprot' },
  { value: 'OTHER', label: 'Lainnya' },
];

const DOSAGE_UNITS = [
  { value: 'MG', label: 'mg' },
  { value: 'G', label: 'g' },
  { value: 'ML', label: 'ml' },
  { value: 'MCG', label: 'mcg' },
  { value: 'IU', label: 'IU' },
  { value: 'TABLET', label: 'tablet' },
  { value: 'CAPSULE', label: 'kapsul' },
  { value: 'DOSE', label: 'dosis' },
  { value: 'PUFF', label: 'puff' },
  { value: 'DROP', label: 'tetes' },
  { value: 'PATCH', label: 'plester' },
  { value: 'OTHER', label: 'lainnya' },
];

const FREQUENCIES = [
  { value: 'ONCE_DAILY', label: '1x sehari' },
  { value: 'TWICE_DAILY', label: '2x sehari' },
  { value: 'THREE_TIMES_DAILY', label: '3x sehari' },
  { value: 'FOUR_TIMES_DAILY', label: '4x sehari' },
  { value: 'EVERY_8_HOURS', label: 'Setiap 8 jam' },
  { value: 'EVERY_12_HOURS', label: 'Setiap 12 jam' },
  { value: 'EVERY_24_HOURS', label: 'Setiap 24 jam' },
  { value: 'EVERY_WEEK', label: 'Setiap minggu' },
  { value: 'EVERY_MONTH', label: 'Setiap bulan' },
  { value: 'AS_NEEDED', label: 'Bila perlu' },
  { value: 'CUSTOM', label: 'Kustom' },
];

const TIMINGS = [
  { value: 'BEFORE_MEAL', label: 'Sebelum makan' },
  { value: 'WITH_MEAL', label: 'Saat makan' },
  { value: 'AFTER_MEAL', label: 'Setelah makan' },
  { value: 'BEDTIME', label: 'Sebelum tidur' },
  { value: 'MORNING', label: 'Pagi' },
  { value: 'AFTERNOON', label: 'Siang' },
  { value: 'EVENING', label: 'Sore' },
  { value: 'ANYTIME', label: 'Kapan saja' },
];

function MedicationForm({ medication, onChange }: {
  medication: MedicationDetails;
  onChange: (medication: MedicationDetails) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: keyof MedicationDetails, value: string | number) => {
    const updated = { ...medication, [field]: value };

    // Validate the field
    try {
      MedicationDetailsSchema.partial().parse({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof Error) {
        setErrors(prev => ({ ...prev, [field]: error.message }));
      }
    }

    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Pill className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Detail Obat</h3>
        <div className="flex-1" />
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Otomatis terstruktur
        </div>
      </div>

      {/* Medication Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama Obat *
        </label>
        <input
          type="text"
          value={medication.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Contoh: Candesartan"
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Generic Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama Generik (Opsional)
        </label>
        <input
          type="text"
          value={medication.genericName || ''}
          onChange={(e) => handleFieldChange('genericName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Contoh: Candesartan Cilexetil"
        />
      </div>

      {/* Category and Form */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori *
          </label>
          <select
            value={medication.category}
            onChange={(e) => handleFieldChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {MEDICATION_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bentuk *
          </label>
          <select
            value={medication.form}
            onChange={(e) => handleFieldChange('form', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {MEDICATION_FORMS.map(form => (
              <option key={form.value} value={form.value}>{form.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dosage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dosis *
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={medication.dosage}
            onChange={(e) => handleFieldChange('dosage', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Contoh: 20mg"
          />
          <select
            value={medication.dosageUnit}
            onChange={(e) => handleFieldChange('dosageUnit', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {DOSAGE_UNITS.map(unit => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </div>
        {errors.dosage && (
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.dosage}
          </p>
        )}
      </div>

      {/* Frequency and Timing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frekuensi *
          </label>
          <select
            value={medication.frequency}
            onChange={(e) => handleFieldChange('frequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {FREQUENCIES.map(freq => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Waktu Minum *
          </label>
          <select
            value={medication.timing}
            onChange={(e) => handleFieldChange('timing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIMINGS.map(timing => (
              <option key={timing.value} value={timing.value}>{timing.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instruksi (Opsional)
        </label>
        <textarea
          value={medication.instructions || ''}
          onChange={(e) => handleFieldChange('instructions', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={2}
          placeholder="Contoh: Minum dengan air putih, jangan digiling"
        />
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dokter Pengirim (Opsional)
          </label>
          <input
            type="text"
            value={medication.prescribedBy || ''}
            onChange={(e) => handleFieldChange('prescribedBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama dokter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apotek (Opsional)
          </label>
          <input
            type="text"
            value={medication.pharmacy || ''}
            onChange={(e) => handleFieldChange('pharmacy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama apotek"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catatan (Opsional)
        </label>
        <textarea
          value={medication.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={2}
          placeholder="Catatan tambahan tentang obat"
        />
      </div>
    </div>
  );
}

export function EditReminderModal({
  isOpen,
  reminder,
  onClose,
  onSave,
  formatDate,
}: EditReminderModalProps) {
  const [editTime, setEditTime] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
  const [medicationDetails, setMedicationDetails] = useState<MedicationDetails>({
    name: '',
    category: 'OTHER',
    form: 'TABLET',
    dosage: '',
    dosageUnit: 'MG',
    frequency: 'ONCE_DAILY',
    timing: 'ANYTIME',
  });
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset state when modal opens with new reminder
  React.useEffect(() => {
    if (isOpen && reminder) {
      setEditTime(reminder.scheduledTime);
      setEditMessage(
        reminder.customMessage || reminder.medicationDetails?.name || "Pengingat obat"
      );
      setSelectedContent(reminder.attachedContent || []);

      // Initialize medication details if available
      if (reminder.medicationDetails) {
        setMedicationDetails(reminder.medicationDetails);
        setShowMedicationForm(true);
      } else {
        // Try to parse medication from custom message
        const parsed = MedicationParser.parseFromReminder(undefined, reminder.customMessage);
        setMedicationDetails(parsed);
        setShowMedicationForm(parsed.name !== 'Unknown Medication');
      }

      setIsUpdating(false);
    }
  }, [isOpen, reminder]);

  const handleSave = async () => {
    if (!editTime) {
      toast.error("Waktu pengingat tidak boleh kosong");
      return;
    }
    if (!editMessage.trim()) {
      toast.error("Pesan pengingat tidak boleh kosong");
      return;
    }

    // Validate medication details if form is shown
    if (showMedicationForm && medicationDetails.name) {
      try {
        MedicationDetailsSchema.parse(medicationDetails);
      } catch (error) {
        if (error instanceof Error) {
          toast.error("Data obat tidak valid: " + error.message);
          return;
        }
      }
    }

    setIsUpdating(true);
    try {
      const medication = showMedicationForm && medicationDetails.name ? medicationDetails : undefined;
      await onSave(editTime, editMessage, selectedContent, medication);
      onClose();
    } catch {
      // Error handling is done in the parent
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMedicationChange = (medication: MedicationDetails) => {
    setMedicationDetails(medication);

    // Update the message with medication details
    if (medication.name) {
      const newMessage = `Pengingat minum obat ${medication.name} (${medication.dosage})`;
      setEditMessage(newMessage);
    }
  };

  const toggleMedicationForm = () => {
    if (showMedicationForm) {
      setShowMedicationForm(false);
    } else {
      setShowMedicationForm(true);
    }
  };

  const getContentPrefix = (contentType: string): string => {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📚 Baca juga:";
      case "video":
        return "🎥 Tonton juga:";
      default:
        return "📖 Lihat juga:";
    }
  };

  const getContentIcon = (contentType: string): string => {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📄";
      case "video":
        return "🎥";
      default:
        return "📖";
    }
  };

  const generatePreviewMessage = (
    message: string,
    content: ContentItem[]
  ): string => {
    if (!content || content.length === 0) {
      return message;
    }

    let previewMessage = message;

    const contentByType: { [key: string]: ContentItem[] } = {};
    content.forEach((item) => {
      const type = item.type?.toLowerCase() || "other";
      if (!contentByType[type]) {
        contentByType[type] = [];
      }
      contentByType[type].push(item);
    });

    Object.keys(contentByType).forEach((contentType) => {
      const contents = contentByType[contentType];
      previewMessage += `\n\n${getContentPrefix(contentType)}`;

      contents.forEach((item) => {
        const icon = getContentIcon(item.type);
        previewMessage += `\n${icon} ${item.title}`;
        previewMessage += `\n   ${item.url}`;
      });
    });

    previewMessage += "\n\n💙 Tim PRIMA";

    return previewMessage;
  };

  if (!isOpen || !reminder) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Pengingat
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            disabled={isUpdating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Pengingat Saat Ini:
            </h4>
            <p className="font-medium text-gray-900">
              {reminder.customMessage || reminder.medicationDetails?.name || "Pengingat obat"}
            </p>
            <p className="text-sm text-gray-600">
              {formatDate(reminder.nextReminderDate)} -{" "}
              {reminder.scheduledTime}
            </p>
          </div>

          {/* Medication Form Toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Informasi Obat Terstruktur
                </h4>
                <p className="text-xs text-blue-700">
                  Tambahkan detail obat untuk monitoring yang lebih baik
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMedicationForm}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                showMedicationForm
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {showMedicationForm ? "Aktif" : "Aktifkan"}
            </button>
          </div>

          {/* Medication Form */}
          {showMedicationForm && (
            <MedicationForm
              medication={medicationDetails}
              onChange={handleMedicationChange}
            />
          )}

          {/* Message Preview */}
          {(editMessage.trim() || selectedContent.length > 0) && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-700 mb-2">
                Pratinjau Pesan WhatsApp:
              </h4>
              <div className="bg-white p-3 rounded border text-sm text-gray-800 whitespace-pre-line max-h-32 overflow-y-auto">
                {generatePreviewMessage(
                  editMessage.trim() || "Pengingat obat",
                  selectedContent
                )}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Pesan ini akan dikirim ke pasien dengan konten yang dipilih
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pesan Pengingat
              </label>
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isUpdating}
                placeholder="Contoh: Jangan lupa minum obat candesartan pada waktu yang tepat"
              />
              {showMedicationForm && medicationDetails.name && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  Pesan otomatis diperbarui berdasarkan detail obat
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waktu Pengingat
              </label>
              <TimePicker24h
                value={editTime}
                onChange={setEditTime}
                placeholder="Pilih waktu pengingat"
                disabled={isUpdating}
                required
              />
            </div>

            {/* Content Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lampirkan Konten (Opsional)
              </label>
              <ContentSelector
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                maxSelection={5}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex space-x-3 p-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            disabled={isUpdating}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUpdating || !editTime || !editMessage.trim()}
          >
            {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}