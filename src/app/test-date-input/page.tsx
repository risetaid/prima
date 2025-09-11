'use client'

import { useState } from 'react'
import { IndonesianDateInput } from '@/components/ui/indonesian-date-input'

export default function TestDateInputPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const [minDate] = useState('2024-01-01')
  const [maxDate] = useState('2025-12-31')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Test Native Indonesian Date Input
        </h1>

        <div className="space-y-6">
          {/* Basic Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Basic Date Input
            </label>
            <IndonesianDateInput
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="hh/bb/tttt"
            />
          </div>

          {/* Date Input with Constraints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date with Min/Max (2024-2025)
            </label>
            <IndonesianDateInput
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="hh/bb/tttt"
              min={minDate}
              max={maxDate}
            />
          </div>

          {/* Disabled Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disabled Date Input
            </label>
            <IndonesianDateInput
              value="2024-09-10"
              onChange={() => {}}
              placeholder="hh/bb/tttt"
              disabled
            />
          </div>

          {/* Required Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Date Input
            </label>
            <IndonesianDateInput
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="hh/bb/tttt"
              required
            />
          </div>

          {/* Display Selected Value */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Selected Value (ISO Format):
            </h3>
            <p className="text-sm text-blue-600 font-mono">
              {selectedDate || 'No date selected'}
            </p>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              How to Test:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Click the calendar icon to open native datepicker</li>
              <li>• Type Indonesian format (dd/mm/yyyy) directly</li>
              <li>• Try dates outside min/max range</li>
              <li>• Test on mobile devices for native picker</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

