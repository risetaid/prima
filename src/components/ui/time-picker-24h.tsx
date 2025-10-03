"use client";

import { useState, useEffect, useRef } from "react";

interface TimePicker24hProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  selectedDate?: string; // YYYY-MM-DD format - if provided, only restrict past times for today
}

export function TimePicker24h({
  value,
  onChange,
  className = "",
  disabled = false,
  selectedDate,
}: TimePicker24hProps) {
  const [selectedHour, setSelectedHour] = useState<string>("");
  const [selectedMinute, setSelectedMinute] = useState<string>("");
  const isInitialized = useRef(false);

  // Parse initial value - only on mount or when external value changes
  useEffect(() => {
    if (value && value.includes(":")) {
      const [hour, minute] = value.split(":");
      const newHour = hour.padStart(2, "0");
      const newMinute = minute.padStart(2, "0");

      // Only update if different from current state to prevent loops
      if (newHour !== selectedHour || newMinute !== selectedMinute) {
        setSelectedHour(newHour);
        setSelectedMinute(newMinute);
        isInitialized.current = true;
      }
    } else if (!isInitialized.current) {
      // Set default to current time only once on mount if no value
      const now = new Date();
      setSelectedHour(now.getHours().toString().padStart(2, "0"));
      setSelectedMinute(now.getMinutes().toString().padStart(2, "0"));
      isInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // Intentionally exclude selectedHour and selectedMinute to prevent infinite loop

  // Update parent when selections change - but NOT when onChange changes
  useEffect(() => {
    if (selectedHour && selectedMinute && isInitialized.current) {
      const timeString = `${selectedHour}:${selectedMinute}`;
      // Only call onChange if the time actually changed
      if (timeString !== value) {
        onChange(timeString);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHour, selectedMinute, value]); // Remove onChange from dependencies to prevent infinite loop

  // Get current time for validation
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 6 }, (_, i) =>
    (i * 10).toString().padStart(2, "0")
  );

  // Check if a time is in the past
  const isTimeInPast = (hour: number, minute: number): boolean => {
    // If no date is selected, allow all times
    if (!selectedDate) return false;

    const today = new Date().toISOString().split("T")[0];

    // If selected date is before today, allow all times (date picker handles this)
    if (selectedDate < today) return false;

    // If selected date is after today, allow all times
    if (selectedDate > today) return false;

    // Selected date is today - restrict based on current time
    if (hour < currentHour) return true; // Past hour
    if (hour === currentHour && minute < currentMinute) return true; // Same hour, past minute

    return false; // Current hour with current/later minute, or future hour
  };

  return (
    <div className={`relative ${className}`}>
      {/* Time Selectors */}
      <div className="flex items-center space-x-4">
        {/* Hour Selector */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Jam
          </label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">--</option>
            {hours.map((hour) => {
              const hourNum = parseInt(hour);
              const isPast = selectedMinute
                ? isTimeInPast(hourNum, parseInt(selectedMinute))
                : false;
              return (
                <option
                  key={hour}
                  value={hour}
                  disabled={isPast}
                  className={isPast ? "text-gray-400" : ""}
                >
                  {hour}
                </option>
              );
            })}
          </select>
        </div>

        {/* Separator */}
        <div className="flex items-center pt-6">
          <span className="text-lg font-bold text-gray-400">:</span>
        </div>

        {/* Minute Selector */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Menit
          </label>
          <select
            value={selectedMinute}
            onChange={(e) => setSelectedMinute(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">--</option>
            {minutes.map((minute) => {
              const minuteNum = parseInt(minute);
              const isPast = selectedHour
                ? isTimeInPast(parseInt(selectedHour), minuteNum)
                : false;
              return (
                <option
                  key={minute}
                  value={minute}
                  disabled={isPast}
                  className={isPast ? "text-gray-400" : ""}
                >
                  {minute}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}

export default TimePicker24h;
