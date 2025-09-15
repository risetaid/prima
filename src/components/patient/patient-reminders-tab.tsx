import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";

interface Patient {
  name: string;
  complianceRate: number;
  isActive: boolean;
  verificationStatus: string;
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
}

interface PatientRemindersTabProps {
  patient: Patient;
  completedReminders: CompletedReminder[];
  onAddReminder: () => void;
  onViewReminders: () => void;
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

        {/* Compliance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Statistik Kepatuhan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {patient.complianceRate}%
              </div>
              <p className="text-gray-600">Tingkat Kepatuhan</p>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">
                  Total Pengingat Selesai: {completedReminders.filter(r => r.medicationTaken).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Reminders */}
      {completedReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengingat Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedReminders.slice(0, 5).map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                     <p className="font-medium">{reminder.customMessage || "Pengingat obat"}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(reminder.completedDate).toLocaleDateString('id-ID')} • {reminder.scheduledTime}
                    </p>
                  </div>
                  <Badge variant={reminder.medicationTaken ? "default" : "secondary"}>
                    {reminder.medicationTaken ? "Dikonfirmasi" : "Tidak Dikonfirmasi"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}