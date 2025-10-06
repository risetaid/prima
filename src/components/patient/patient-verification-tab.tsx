import { WhatsAppVerificationSection } from "@/components/patient/whatsapp-verification-section";
import { Patient as SchemaPatient } from "@/db/schema";

interface Patient extends SchemaPatient {
  complianceRate: number;
  assignedVolunteer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string | null;
  } | null;
}

interface PatientVerificationTabProps {
  patient: Patient;
  onUpdate: () => void;
}

export function PatientVerificationTab({ patient, onUpdate }: PatientVerificationTabProps) {
  return (
    <WhatsAppVerificationSection
      patient={patient}
      onUpdate={onUpdate}
    />
  );
}