import { Repeat } from "lucide-react";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { TimePicker24h } from "@/components/ui/time-picker-24h";
import { isTimeValidForSelectedDates, getCurrentDateWIB } from "@/lib/datetime";
import { useState, useEffect } from "react";

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

interface DateTimeSelectorProps {
  time: string;
  onTimeChange: (time: string) => void;
  selectedDates: string[];
  onDateChange: (dates: string[]) => void;
  customRecurrence: CustomRecurrence;
  onCustomRecurrenceChange: (recurrence: CustomRecurrence) => void;
  onOpenCustomRecurrence: () => void;
}

export function DateTimeSelector({
  time,
  onTimeChange,
  selectedDates,
  onDateChange,
  customRecurrence,
  onCustomRecurrenceChange,
  onOpenCustomRecurrence,
}: DateTimeSelectorProps) {
  const [timeError, setTimeError] = useState<string>("");

  // Validate time whenever dates or time changes
  useEffect(() => {
    if (time && selectedDates.length > 0 && !customRecurrence.enabled) {
      const validation = isTimeValidForSelectedDates(selectedDates, time);
      setTimeError(validation.isValid ? "" : validation.errorMessage || "");
    } else {
      setTimeError("");
    }
  }, [time, selectedDates, customRecurrence.enabled]);

  const handleDateChange = (dates: string[]) => {
    onDateChange(dates);
    if (dates.length > 0 && customRecurrence.enabled) {
      onCustomRecurrenceChange({
        ...customRecurrence,
        enabled: false,
      });
    }
  };

  const handleTimeChange = (newTime: string) => {
    // Only validate if we have selected dates and custom recurrence is disabled
    if (selectedDates.length > 0 && !customRecurrence.enabled) {
      const validation = isTimeValidForSelectedDates(selectedDates, newTime);
      if (!validation.isValid) {
        setTimeError(validation.errorMessage || "");
        return; // Don't update the time if it's invalid
      } else {
        setTimeError("");
      }
    } else {
      setTimeError("");
    }

    onTimeChange(newTime);
  };

  const handleCustomRecurrenceClick = () => {
    if (selectedDates.length > 0) {
      onDateChange([]);
    }
    onOpenCustomRecurrence();
  };

  const resetCustomRecurrence = () => {
    onCustomRecurrenceChange({
      enabled: false,
      frequency: "week",
      interval: 1,
      daysOfWeek: [],
      daysOfMonth: [],
      endType: "never",
      endDate: "",
      occurrences: 1,
    });
  };

  return (
    <div>
      <label className="block text-gray-500 text-sm mb-2">
        Jam Pengingat
      </label>
      <TimePicker24h
        value={time}
        onChange={handleTimeChange}
        placeholder="Pilih jam pengingat"
        required
      />
      {timeError && (
        <p className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded">
          ⚠️ {timeError}
        </p>
      )}
      {selectedDates.length > 0 && !customRecurrence.enabled && selectedDates.includes(getCurrentDateWIB()) && (
        <p className="mt-1 text-xs text-blue-600 bg-blue-50 p-2 rounded">
          ℹ️ Hari ini dipilih, jam harus lebih besar dari jam saat ini
        </p>
      )}

      <div className="mt-4">
        <label className="block text-gray-500 text-sm mb-2">
          Pilih Tanggal Pengingat
        </label>
        <div
          className={
            customRecurrence.enabled ? "opacity-50 pointer-events-none" : ""
          }
        >
          <DatePickerCalendar
            selectedDates={selectedDates}
            onDateChange={handleDateChange}
          />
        </div>
        {customRecurrence.enabled && (
          <p className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            📅 Kalender dinonaktifkan karena pengulangan kustom sedang aktif
          </p>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleCustomRecurrenceClick}
            disabled={selectedDates.length > 0 && !customRecurrence.enabled}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              selectedDates.length > 0 && !customRecurrence.enabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span className="text-sm font-medium">
              {customRecurrence.enabled
                ? "Pengulangan kustom aktif"
                : "Pengulangan kustom"}
            </span>
          </button>
          {selectedDates.length > 0 && !customRecurrence.enabled && (
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              🔄 Pengulangan kustom dinonaktifkan karena sudah memilih
              tanggal dari kalender
            </p>
          )}

          {customRecurrence.enabled && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                Ulangi setiap {customRecurrence.interval}{" "}
                {customRecurrence.frequency === "day"
                  ? "hari"
                  : customRecurrence.frequency === "week"
                  ? "minggu"
                  : "bulan"}
                {customRecurrence.daysOfWeek.length > 0 &&
                  customRecurrence.frequency === "week" && (
                    <span>
                      {" "}
                      pada{" "}
                      {customRecurrence.daysOfWeek
                        .map((day) => {
                          const dayMap: { [key: string]: string } = {
                            0: "Minggu",
                            1: "Senin",
                            2: "Selasa",
                            3: "Rabu",
                            4: "Kamis",
                            5: "Jumat",
                            6: "Sabtu",
                          };
                          return dayMap[day];
                        })
                        .join(", ")}
                    </span>
                  )}
                {customRecurrence.endType === "on" &&
                  ` sampai ${customRecurrence.endDate}`}
                {customRecurrence.endType === "after" &&
                  ` selama ${customRecurrence.occurrences} kejadian`}
              </p>
              <button
                type="button"
                onClick={resetCustomRecurrence}
                className="mt-2 text-xs text-red-600 hover:text-red-800 cursor-pointer"
              >
                ✕ Hapus pengulangan kustom
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}