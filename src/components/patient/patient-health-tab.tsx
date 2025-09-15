import { HealthNotesSection } from "@/components/patient/health-notes-section";

interface HealthNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

interface PatientHealthTabProps {
  healthNotes: HealthNote[];
  patientId: string;
  onAddNote: (note: string, date: string) => Promise<void>;
  onEditNote: (noteId: string, note: string, date: string) => Promise<void>;
  onDeleteNotes: (noteIds: string[]) => Promise<void>;
}

export function PatientHealthTab({
  healthNotes,
  patientId,
  onAddNote,
  onEditNote,
  onDeleteNotes,
}: PatientHealthTabProps) {
  return (
    <HealthNotesSection
      healthNotes={healthNotes}
      patientId={patientId}
      onAddNote={onAddNote}
      onEditNote={onEditNote}
      onDeleteNotes={onDeleteNotes}
    />
  );
}