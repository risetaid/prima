"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContentSelector } from "@/components/reminder/ContentSelector";
import { MessageInput } from "@/components/reminder/MessageInput";
import { DateTimeSelector } from "@/components/reminder/DateTimeSelector";
import { CustomRecurrenceModal } from "@/components/reminder/CustomRecurrenceModal";
import { PatientInfo } from "@/components/reminder/PatientInfo";
import { useReminderForm } from "@/hooks/use-reminder-form";

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientName: string;
}

export function AddReminderModal({
  isOpen,
  onClose,
  onSuccess,
}: AddReminderModalProps) {
  const {
    patient,
    loading,
    submitting,
    selectedDates,
    setSelectedDates: handleDateChange,
    isCustomRecurrenceOpen,
    setIsCustomRecurrenceOpen,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    autoFillData,
    formData,
    setFormData,
    selectedContent,
    setSelectedContent,
    customRecurrence,
    setCustomRecurrence,
    handleSubmit,
  } = useReminderForm(onSuccess, onClose);



  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tambah Pengingat Baru</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <PatientInfo patient={patient} />

                  <MessageInput
                    message={formData.message}
                    onMessageChange={(message) =>
                      setFormData({ ...formData, message })
                    }
                    templates={templates}
                    autoFillData={autoFillData}
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={setSelectedTemplate}
                    time={formData.time}
                    selectedDates={selectedDates}
                  />



                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-700 text-sm font-medium">
                      Lampirkan Konten Edukasi{" "}
                      <span className="text-gray-400">(opsional)</span>
                    </label>
                    {selectedContent.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {selectedContent.length}/5 dipilih
                      </span>
                    )}
                  </div>
                  <ContentSelector
                    selectedContent={selectedContent}
                    onContentChange={setSelectedContent}
                  />
                </div>

                <DateTimeSelector
                  time={formData.time}
                  onTimeChange={(time) => setFormData({ ...formData, time })}
                  selectedDates={selectedDates}
                  onDateChange={handleDateChange}
                  customRecurrence={customRecurrence}
                  onCustomRecurrenceChange={setCustomRecurrence}
                  onOpenCustomRecurrence={() => setIsCustomRecurrenceOpen(true)}
                />
              </form>
            )}
          </div>

          {!loading && (
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                ✕ Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                <span className="mr-2">▶</span>
                {submitting ? "Loading..." : "Submit"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <CustomRecurrenceModal
        isOpen={isCustomRecurrenceOpen}
        onClose={() => setIsCustomRecurrenceOpen(false)}
        customRecurrence={customRecurrence}
        onRecurrenceChange={setCustomRecurrence}
        onApply={() => {
          setCustomRecurrence((prev) => ({ ...prev, enabled: true }));
          handleDateChange([]); // Clear all selected dates when enabling recurrence
          setIsCustomRecurrenceOpen(false);
        }}
      />
    </>
  );
}
