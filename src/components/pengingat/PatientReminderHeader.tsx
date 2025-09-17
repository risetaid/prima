import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PatientReminderHeaderProps {
  patientName: string;
  canAddReminders: boolean;
  onAddReminder: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PatientReminderHeader({
  patientName,
  canAddReminders,
  onAddReminder,
  onRefresh,
  isRefreshing = false,
}: PatientReminderHeaderProps) {
  const handleAddReminder = () => {
    if (!canAddReminders) {
      toast.error('Pasien belum terverifikasi', {
        description:
          'Tambah pengingat dinonaktifkan sampai pasien menyetujui verifikasi WhatsApp.',
      });
      return;
    }
    onAddReminder();
  };

  return (
    <div className="mb-8">
      <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Pengingat untuk {patientName}
          </h1>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                  isRefreshing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Memperbarui...' : 'Perbarui'}</span>
              </button>
            )}

            <button
              onClick={handleAddReminder}
              disabled={!canAddReminders}
               className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                canAddReminders
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Pengingat Baru</span>
            </button>
          </div>

          {!canAddReminders && (
            <p className="text-xs text-gray-500 mt-1">
              Pasien belum terverifikasi. Kirim verifikasi dan tunggu balasan
              &quot;YA&quot;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}