"use client";

import { Edit, Clock, Calendar } from "lucide-react";
import { MedicationDetails } from "@/lib/medication-parser";

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

interface ReminderItemProps {
  reminder: ScheduledReminder;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (reminder: ScheduledReminder) => void;
  formatDate: (dateString: string) => string;
}

function getMedicationCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'CHEMOTHERAPY': 'bg-red-100 text-red-800',
    'TARGETED_THERAPY': 'bg-purple-100 text-purple-800',
    'IMMUNOTHERAPY': 'bg-green-100 text-green-800',
    'HORMONAL_THERAPY': 'bg-pink-100 text-pink-800',
    'PAIN_MANAGEMENT': 'bg-orange-100 text-orange-800',
    'ANTIEMETIC': 'bg-blue-100 text-blue-800',
    'ANTIBIOTIC': 'bg-yellow-100 text-yellow-800',
    'ANTIVIRAL': 'bg-indigo-100 text-indigo-800',
    'ANTIFUNGAL': 'bg-teal-100 text-teal-800',
    'SUPPLEMENT': 'bg-gray-100 text-gray-800',
    'OTHER': 'bg-gray-100 text-gray-800',
  };
  return colors[category] || colors.OTHER;
}

function getMedicationFormIcon(form: string): string {
  const icons: Record<string, string> = {
    'TABLET': '💊',
    'CAPSULE': '🧪',
    'LIQUID': '🥤',
    'INJECTION': '💉',
    'INFUSION': '💧',
    'CREAM': '🧴',
    'PATCH': '🩹',
    'INHALER': '💨',
    'SPRAY': '🌫️',
    'OTHER': '💊',
  };
  return icons[form] || icons.OTHER;
}

function getFrequencyDisplay(frequency: string): string {
  const displayMap: Record<string, string> = {
    'ONCE_DAILY': '1x sehari',
    'TWICE_DAILY': '2x sehari',
    'THREE_TIMES_DAILY': '3x sehari',
    'FOUR_TIMES_DAILY': '4x sehari',
    'EVERY_8_HOURS': 'Setiap 8 jam',
    'EVERY_12_HOURS': 'Setiap 12 jam',
    'EVERY_24_HOURS': 'Setiap 24 jam',
    'EVERY_WEEK': 'Setiap minggu',
    'EVERY_MONTH': 'Setiap bulan',
    'AS_NEEDED': 'Bila perlu',
    'CUSTOM': 'Kustom',
  };
  return displayMap[frequency] || frequency;
}

function getTimingDisplay(timing: string): string {
  const displayMap: Record<string, string> = {
    'BEFORE_MEAL': 'Sebelum makan',
    'WITH_MEAL': 'Saat makan',
    'AFTER_MEAL': 'Setelah makan',
    'BEDTIME': 'Sebelum tidur',
    'MORNING': 'Pagi',
    'AFTERNOON': 'Siang',
    'EVENING': 'Sore',
    'ANYTIME': 'Kapan saja',
  };
  return displayMap[timing] || timing;
}

function MedicationInfo({ medication }: { medication: MedicationDetails | undefined }) {
  if (!medication) return null;

  return (
    <div className="mt-2 pt-2 border-t border-blue-400 border-opacity-30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getMedicationFormIcon(medication.form)}</span>
          <span className="font-medium text-blue-100">{medication.name}</span>
        </div>
        <div className="text-xs bg-blue-600 bg-opacity-50 px-2 py-1 rounded-full text-blue-100">
          {medication.category}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-blue-100">
        <div>Dosis: {medication.dosage}</div>
        <div>Frekuensi: {getFrequencyDisplay(medication.frequency)}</div>
        <div>Waktu: {getTimingDisplay(medication.timing)}</div>
        <div>Bentuk: {medication.form}</div>
      </div>
      {medication.instructions && (
        <div className="mt-2 text-xs text-blue-100 bg-blue-600 bg-opacity-20 rounded px-2 py-1">
          💡 {medication.instructions}
        </div>
      )}
    </div>
  );
}

export function ReminderItem({
  reminder,
  isDeleteMode,
  isSelected,
  onToggleSelection,
  onEdit,
  formatDate,
}: ReminderItemProps) {
  const hasMedication = reminder.medicationDetails && reminder.medicationDetails.name;
  const isGenericReminder = !reminder.customMessage || reminder.customMessage === "Pengingat obat";

  return (
    <div className="flex items-center space-x-3">
      {isDeleteMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(reminder.id)}
          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-2 border-blue-300"
        />
      )}
      <div
        className={`flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 transition-all duration-200 ${
          isDeleteMode
            ? ""
            : "cursor-pointer hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 hover:shadow-lg"
        }`}
        onClick={() => onEdit(reminder)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {hasMedication && (
                <span className="text-xl">
                  {getMedicationFormIcon(reminder.medicationDetails?.form || 'TABLET')}
                </span>
              )}
              <h3 className="font-semibold text-white">
                {hasMedication
                  ? reminder.medicationDetails?.name
                  : reminder.customMessage || "Pengingat obat"
                }
              </h3>
              {hasMedication && (
                <span className={`text-xs px-2 py-1 rounded-full ${getMedicationCategoryColor(reminder.medicationDetails?.category || 'OTHER')} text-white`}>
                  {reminder.medicationDetails?.category}
                </span>
              )}
            </div>

            {!isGenericReminder && !hasMedication && (
              <p className="text-blue-100 text-sm mb-1">
                {reminder.customMessage}
              </p>
            )}

            <div className="flex items-center space-x-4 text-blue-100 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(reminder.nextReminderDate)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{reminder.scheduledTime}</span>
              </div>
            </div>

            {/* Enhanced Medication Information */}
            {hasMedication && <MedicationInfo medication={reminder.medicationDetails} />}

            {!isDeleteMode && (
              <p className="text-blue-200 text-xs mt-3 flex items-center space-x-1">
                <Edit className="w-3 h-3" />
                <span>Ketuk untuk mengedit reminder</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}