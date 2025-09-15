import { IndonesianDateInput } from "@/components/ui/indonesian-date-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomRecurrence {
  enabled: boolean;
  frequency: "day" | "week" | "month";
  interval: number;
  daysOfWeek: number[];
  daysOfMonth: number[];
  endType: "never" | "on" | "after";
  endDate: string;
  occurrences: number;
}

interface CustomRecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customRecurrence: CustomRecurrence;
  onRecurrenceChange: (recurrence: CustomRecurrence) => void;
  onApply: () => void;
}

export function CustomRecurrenceModal({
  isOpen,
  onClose,
  customRecurrence,
  onRecurrenceChange,
  onApply,
}: CustomRecurrenceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pengulangan Kustom</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ulangi setiap
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="999"
                value={customRecurrence.interval}
                onChange={(e) =>
                  onRecurrenceChange({
                    ...customRecurrence,
                    interval: parseInt(e.target.value) || 1,
                  })
                }
                className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={customRecurrence.frequency}
                onChange={(e) =>
                  onRecurrenceChange({
                    ...customRecurrence,
                    frequency: e.target.value as "day" | "week" | "month",
                  })
                }
                className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="day">hari</option>
                <option value="week">minggu</option>
                <option value="month">bulan</option>
              </select>
            </div>
          </div>

          {customRecurrence.frequency === "week" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ulangi pada hari
              </label>
              <div className="flex space-x-1">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const newDays = customRecurrence.daysOfWeek.includes(
                          index
                        )
                          ? customRecurrence.daysOfWeek.filter(
                              (d) => d !== index
                            )
                          : [...customRecurrence.daysOfWeek, index];
                        onRecurrenceChange({
                          ...customRecurrence,
                          daysOfWeek: newDays,
                        });
                      }}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                        customRecurrence.daysOfWeek.includes(index)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {customRecurrence.frequency === "month" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ulangi pada tanggal
              </label>
              <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const newDays = customRecurrence.daysOfMonth.includes(day)
                        ? customRecurrence.daysOfMonth.filter((d) => d !== day)
                        : [...customRecurrence.daysOfMonth, day];
                      onRecurrenceChange({
                        ...customRecurrence,
                        daysOfMonth: newDays,
                      });
                    }}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      customRecurrence.daysOfMonth.includes(day)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pilih satu atau lebih tanggal dalam bulan untuk pengulangan bulanan
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Berakhir
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={customRecurrence.endType === "never"}
                  onChange={(e) =>
                    onRecurrenceChange({
                      ...customRecurrence,
                      endType: e.target.value as "never" | "on" | "after",
                    })
                  }
                  className="text-blue-500"
                />
                <span className="text-sm text-gray-700">Tidak pernah</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="endType"
                  value="on"
                  checked={customRecurrence.endType === "on"}
                  onChange={(e) =>
                    onRecurrenceChange({
                      ...customRecurrence,
                      endType: e.target.value as "never" | "on" | "after",
                    })
                  }
                  className="text-blue-500"
                />
                <span className="text-sm text-gray-700">Pada tanggal</span>
                <IndonesianDateInput
                  value={customRecurrence.endDate}
                  onChange={(value) =>
                    onRecurrenceChange({
                      ...customRecurrence,
                      endDate: value,
                    })
                  }
                  disabled={customRecurrence.endType !== "on"}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="hh/bb/tttt"
                />
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="endType"
                  value="after"
                  checked={customRecurrence.endType === "after"}
                  onChange={(e) =>
                    onRecurrenceChange({
                      ...customRecurrence,
                      endType: e.target.value as "never" | "on" | "after",
                    })
                  }
                  className="text-blue-500"
                />
                <span className="text-sm text-gray-700">Setelah</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={customRecurrence.occurrences}
                  onChange={(e) =>
                    onRecurrenceChange({
                      ...customRecurrence,
                      occurrences: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={customRecurrence.endType !== "after"}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-700">kejadian</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 p-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}