import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Clock, Calendar } from "lucide-react";

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
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={onAddReminder}
            className="w-full"
            disabled={!patient.isActive || patient.verificationStatus !== 'VERIFIED'}
          >
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
          <CardTitle>Statistik Pengingat</CardTitle>
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
                {completedReminders.length}
              </div>
              <p className="text-gray-600">Total Pengingat</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {completedReminders.filter(r => r.sentAt).length}
              </div>
              <p className="text-gray-600">Terkirim</p>
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
                        <Badge variant={reminder.sentAt ? "default" : "secondary"}>
                          {reminder.sentAt ? "Terkirim" : "Terjadwal"}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900">
                        {reminder.customMessage || "Pengingat"}
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
                  </div>

                  {reminder.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Catatan:</span> {reminder.notes}
                      </p>
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