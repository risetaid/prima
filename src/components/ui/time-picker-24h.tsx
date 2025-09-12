"use client";

import { useState, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

interface TimePicker24hProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function TimePicker24h({
  value,
  onChange,
  className = "",
  placeholder = "Pilih waktu",
  disabled = false,
  required = false,
}: TimePicker24hProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string>("");
  const [selectedMinute, setSelectedMinute] = useState<string>("");

  // Parse initial value
  useEffect(() => {
    if (value && value.includes(":")) {
      const [hour, minute] = value.split(":");
      setSelectedHour(hour.padStart(2, "0"));
      setSelectedMinute(minute.padStart(2, "0"));
    } else {
      // Set default to current time if no value
      const now = new Date();
      setSelectedHour(now.getHours().toString().padStart(2, "0"));
      setSelectedMinute(now.getMinutes().toString().padStart(2, "0"));
    }
  }, [value]);

  // Update parent when selections change
  useEffect(() => {
    if (selectedHour && selectedMinute) {
      const timeString = `${selectedHour}:${selectedMinute}`;
      if (timeString !== value) {
        onChange(timeString);
      }
    }
  }, [selectedHour, selectedMinute, onChange, value]);

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  const displayValue =
    selectedHour && selectedMinute
      ? `${selectedHour}:${selectedMinute}`
      : placeholder;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 border-2 border-blue-200 rounded-xl
          focus:border-blue-500 focus:outline-none transition-colors
          bg-white text-left flex items-center justify-between
          ${
            disabled
              ? "bg-gray-100 cursor-not-allowed opacity-50"
              : "cursor-pointer hover:border-blue-300"
          }
          ${required && !value ? "border-red-300" : ""}
        `}
      >
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <span
            className={
              displayValue === placeholder ? "text-gray-400" : "text-gray-900"
            }
          >
            {displayValue}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4">
            <div className="flex items-center space-x-4">
              {/* Hour Selector */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Jam
                </label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">--</option>
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
              </div>

              {/* Separator */}
              <div className="flex items-center pt-6">
                <span className="text-lg font-bold text-gray-400">:</span>
              </div>

              {/* Minute Selector */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Menit
                </label>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">--</option>
                  {minutes.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Buttons */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Sekarang", value: new Date() },
                  { label: "08:00", value: "08:00" },
                  { label: "12:00", value: "12:00" },
                  { label: "18:00", value: "18:00" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (preset.label === "Sekarang") {
                        const now = preset.value as Date;
                        setSelectedHour(
                          now.getHours().toString().padStart(2, "0")
                        );
                        setSelectedMinute(
                          now.getMinutes().toString().padStart(2, "0")
                        );
                      } else {
                        const [hour, minute] = (preset.value as string).split(
                          ":"
                        );
                        setSelectedHour(hour);
                        setSelectedMinute(minute);
                      }
                      setIsOpen(false);
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TimePicker24h;
