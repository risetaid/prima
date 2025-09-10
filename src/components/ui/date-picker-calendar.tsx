'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerCalendarProps {
  selectedDates: string[]
  onDateChange: (dates: string[]) => void
  className?: string
}

export function DatePickerCalendar({ selectedDates, onDateChange, className = '' }: DatePickerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}` // Indonesian format: dd/mm/yyyy
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.includes(formatDate(date))
  }

  const isDateInPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const toggleDate = (date: Date) => {
    if (isDateInPast(date)) return

    const dateString = formatDate(date)
    const newSelectedDates = isDateSelected(date)
      ? selectedDates.filter(d => d !== dateString)
      : [...selectedDates, dateString]
    
    onDateChange(newSelectedDates.sort())
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className={`bg-white border-2 border-blue-200 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h3 className="text-lg font-semibold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="h-10" />
          }

          const isSelected = isDateSelected(day)
          const isPast = isDateInPast(day)
          const isToday = formatDate(day) === formatDate(new Date())

          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleDate(day)}
              disabled={isPast}
              className={`
                h-10 w-full rounded-lg text-sm font-medium transition-all duration-200
                ${isPast 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-blue-50 cursor-pointer'
                }
                ${isSelected 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'text-gray-700'
                }
                ${isToday && !isSelected 
                  ? 'bg-blue-100 text-blue-600 font-bold' 
                  : ''
                }
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selected dates info */}
      {selectedDates.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-1">
            Tanggal Terpilih ({selectedDates.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedDates.slice(0, 5).map(date => {
              const dateObj = new Date(date + 'T00:00:00')
              return (
                <span key={date} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  {formatDisplayDate(dateObj)}
                </span>
              )
            })}
            {selectedDates.length > 5 && (
              <span className="text-xs text-blue-600">+{selectedDates.length - 5} lainnya</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}