import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Plus, Eye, CheckCircle, Clock, XCircle, UserX } from "lucide-react";

interface AssignedVolunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
}

interface Patient {
  name: string;
  phoneNumber: string;
  isActive: boolean;
  verificationStatus: string;
  photoUrl: string | null;
  assignedVolunteer: AssignedVolunteer | null;
}

interface PatientHeaderCardProps {
  patient: Patient;
  onAddReminder: () => void;
  onViewReminders: () => void;
}

const getVerificationStatusBadge = (status: string) => {
  switch (status) {
    case "verified":
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Terverifikasi</Badge>;
    case "pending_verification":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
    case "declined":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Ditolak</Badge>;
    case "unsubscribed":
      return <Badge variant="outline"><UserX className="w-3 h-3 mr-1" />Berhenti</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getStatusBadge = (isActive: boolean) => {
  return isActive ?
    <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge> :
    <Badge variant="secondary" className="bg-red-100 text-red-800">Tidak Aktif</Badge>;
};

export function PatientHeaderCard({ patient, onAddReminder, onViewReminders }: PatientHeaderCardProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white/20">
              <AvatarImage src={patient.photoUrl || ""} alt={patient.name} />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                {patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{patient.name}</h1>
              <div className="flex items-center space-x-2 text-blue-100 mb-2">
                <Phone className="w-4 h-4" />
                <span>{patient.phoneNumber}</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(patient.isActive)}
                {getVerificationStatusBadge(patient.verificationStatus)}
              </div>
              {patient.assignedVolunteer && (
                <p className="text-blue-200 text-sm mt-2">
                  Dikelola oleh: {patient.assignedVolunteer.firstName} {patient.assignedVolunteer.lastName}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={onAddReminder}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pengingat
            </Button>
            <Button
              variant="secondary"
              onClick={onViewReminders}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              Lihat Pengingat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}