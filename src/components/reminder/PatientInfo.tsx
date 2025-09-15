interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
}

interface PatientInfoProps {
  patient: Patient | null;
}

export function PatientInfo({ patient }: PatientInfoProps) {
  if (!patient) return null;

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-sm text-gray-700">
        <strong>Pasien:</strong> {patient.name}
      </p>
      <p className="text-sm text-gray-700">
        <strong>WhatsApp:</strong> {patient.phoneNumber}
      </p>
    </div>
  );
}