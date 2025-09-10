'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { isoToIndonesian, indonesianToISO, isValidIndonesianDate } from '@/lib/datetime'

interface IndonesianDateInputProps {
  value?: string // ISO format (yyyy-mm-dd)
  onChange: (value: string) => void // Returns ISO format (yyyy-mm-dd)
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  min?: string // ISO format
  max?: string // ISO format
}

export function IndonesianDateInput({
  value = '',
  onChange,
  placeholder = 'hh/bb/tttt',
  disabled = false,
  className = '',
  required = false,
  min,
  max
}: IndonesianDateInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [error, setError] = useState('')
  const nativeInputRef = useRef<HTMLInputElement>(null)
  const displayInputRef = useRef<HTMLInputElement>(null)

  // Convert ISO to Indonesian format for display
  useEffect(() => {
    if (value) {
      const indonesianFormat = isoToIndonesian(value)
      setDisplayValue(indonesianFormat)
    } else {
      setDisplayValue('')
    }
  }, [value])

  // Handle native datepicker change (yyyy-mm-dd)
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoValue = e.target.value
    if (isoValue) {
      // Check min/max constraints
      if (min && isoValue < min) {
        setError(`Tanggal minimal: ${isoToIndonesian(min)}`)
        return
      }
      if (max && isoValue > max) {
        setError(`Tanggal maksimal: ${isoToIndonesian(max)}`)
        return
      }

      const indonesianFormat = isoToIndonesian(isoValue)
      setDisplayValue(indonesianFormat)
      onChange(isoValue)
      setError('')
    } else {
      setDisplayValue('')
      onChange('')
    }
  }

  // Handle display input change (dd/mm/yyyy)
  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)
    setError('')

    // Validate format as user types
    if (inputValue && !isValidIndonesianDate(inputValue)) {
      setError('Format tanggal tidak valid (hh/bb/tttt)')
    } else if (inputValue) {
      // Convert to ISO and validate
      const isoValue = indonesianToISO(inputValue)
      if (isoValue) {
        // Check min/max constraints
        if (min && isoValue < min) {
          setError(`Tanggal minimal: ${isoToIndonesian(min)}`)
          return
        }
        if (max && isoValue > max) {
          setError(`Tanggal maksimal: ${isoToIndonesian(max)}`)
          return
        }
        onChange(isoValue)
      }
    } else {
      onChange('')
    }
  }

  // Handle display input blur
  const handleDisplayBlur = () => {
    if (displayValue && !isValidIndonesianDate(displayValue)) {
      setError('Format tanggal tidak valid (hh/bb/tttt)')
    } else {
      setError('')
    }
  }

  // Trigger native datepicker
  const triggerNativePicker = () => {
    if (disabled) return

    // Try modern showPicker API first, fallback to focus
    if (nativeInputRef.current?.showPicker) {
      try {
        nativeInputRef.current.showPicker()
      } catch {
        // Fallback for browsers that don't support showPicker
        nativeInputRef.current.focus()
      }
    } else {
      // For older browsers, focus the native input to show picker
      nativeInputRef.current?.focus()
    }
  }

  // Handle display input focus (trigger native picker)
  const handleDisplayFocus = () => {
    if (!disabled) {
      // Small delay to ensure the input is ready
      setTimeout(() => triggerNativePicker(), 10)
    }
  }

  return (
    <div className="relative">
      {/* Hidden native date input - handles the actual datepicker */}
      <input
        ref={nativeInputRef}
        type="date"
        value={value}
        onChange={handleNativeDateChange}
        disabled={disabled}
        min={min}
        max={max}
        className="absolute inset-0 opacity-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Visible Indonesian format input */}
      <div className="relative">
        <input
          ref={displayInputRef}
          type="text"
          value={displayValue}
          onChange={handleDisplayChange}
          onBlur={handleDisplayBlur}
          onFocus={handleDisplayFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={!!required}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white pr-10 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-text'
          } ${error ? 'border-red-500' : ''} ${className}`}
        />
        <button
          type="button"
          onClick={triggerNativePicker}
          disabled={disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}