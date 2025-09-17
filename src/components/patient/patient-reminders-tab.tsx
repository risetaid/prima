import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pill, Clock, Calendar } from "lucide-react";
import { MedicationDetails } from "@/lib/medication-parser";

interface Patient {
  name: string;
  complianceRate: number;
  isActive: boolean;
  verificationStatus: string;
  medicationDetails?: MedicationDetails;
}

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  completedDate: string;
  customMessage?: string;
  medicationTaken: boolean;
  confirmedAt: string;
  sentAt: string | null;
  notes?: string;
  medicationDetails?: MedicationDetails;
}

interface PatientRemindersTabProps {
  patient: Patient;
  completedReminders: CompletedReminder[];
  onAddReminder: () => void;
  onViewReminders: () => void;
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

function MedicationSummary({ medication }: { medication: MedicationDetails | undefined }) {
  if (!medication) return null;

  return (
    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-xl">{getMedicationFormIcon(medication.form)}</span>
        <div>
          <h4 className="font-medium text-gray-900">{medication.name}</h4>
          {medication.genericName && (
            <p className="text-sm text-gray-600">{medication.genericName}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={getMedicationCategoryColor(medication.category)}>
          {medication.category}
        </Badge>
        <Badge variant="outline">
          {medication.form}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Dosis:</span>
          <span className="font-medium ml-1">{medication.dosage}</span>
        </div>
        <div>
          <span className="text-gray-500">Frekuensi:</span>
          <span className="font-medium ml-1">{getFrequencyDisplay(medication.frequency)}</span>
        </div>
        <div>
          <span className="text-gray-500">Waktu:</span>
          <span className="font-medium ml-1">{getTimingDisplay(medication.timing)}</span>
        </div>
      </div>

      {medication.instructions && (
        <div className="text-sm">
          <span className="text-gray-500">Instruksi:</span>
          <p className="text-gray-700 mt-1">{medication.instructions}</p>
        </div>
      )}
    </div>
  );
}

export function PatientRemindersTab({
  patient,
  completedReminders,
  onAddReminder,
  onViewReminders,
}: PatientRemindersTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={onAddReminder} className="w-full" disabled={!patient.isActive || patient.verificationStatus !== 'verified'}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pengingat Baru
            </Button>
            <Button variant="outline" onClick={onViewReminders} className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              Lihat Semua Pengingat
            </Button>
          </CardContent>
        </Card>

        {/* Current Medication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Pill className="w-5 h-5" />
              <span>Obat Saat Ini</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.medicationDetails ? (
              <MedicationSummary medication={patient.medicationDetails} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada informasi obat terstruktur</p>
                <p className="text-sm">Tambahkan pengingat untuk mengatur obat</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik Kepatuhan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {patient.complianceRate}%
              </div>
              <p className="text-gray-600">Tingkat Kepatuhan</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {completedReminders.filter(r => r.medicationTaken).length}
              </div>
              <p className="text-gray-600">Dikonfirmasi</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {completedReminders.filter(r => !r.medicationTaken).length}
              </div>
              <p className="text-gray-600">Belum Dikonfirmasi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Completed Reminders */}
      {completedReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengingat Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedReminders.slice(0, 5).map((reminder) => (
                <div key={reminder.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={reminder.medicationTaken ? "default" : "secondary"}>
                          {reminder.medicationTaken ? "Dikonfirmasi" : "Tidak Dikonfirmasi"}
                        </Badge>
                        {reminder.medicationDetails && (
                          <Badge variant="outline" className={getMedicationCategoryColor(reminder.medicationDetails.category)}>
                            {reminder.medicationDetails.category}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">
                        {reminder.customMessage || reminder.medicationDetails?.name || "Pengingat obat"}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(reminder.completedDate).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{reminder.scheduledTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {reminder.medicationDetails && (
                        <div className="text-2xl">{getMedicationFormIcon(reminder.medicationDetails.form)}</div>
                      )}
                    </div>
                  </div>

                  {reminder.medicationDetails && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Dosis:</span>
                          <span className="font-medium ml-1">{reminder.medicationDetails.dosage}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Frekuensi:</span>
                          <span className="font-medium ml-1">{getFrequencyDisplay(reminder.medicationDetails.frequency)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Waktu:</span>
                          <span className="font-medium ml-1">{getTimingDisplay(reminder.medicationDetails.timing)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bentuk:</span>
                          <span className="font-medium ml-1">{reminder.medicationDetails.form}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}