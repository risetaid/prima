export function getMedicationCategoryColor(category: string): string {
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

export function getMedicationFormIcon(form: string): string {
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

export function getFrequencyDisplay(frequency: string): string {
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

export function getTimingDisplay(timing: string): string {
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