'use client'

import { Bell, BarChart3, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DashboardCards() {
  const router = useRouter()

  const handlePengingatClick = () => {
    // For now, just show alert
    alert('Pengingat feature - Coming soon!')
  }

  const handleStatistikClick = () => {
    alert('Statistik feature - Coming soon!')
  }

  const handleTutorialClick = () => {
    alert('Tutorial feature - Coming soon!')
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Pengingat Card */}
      <div 
        onClick={handlePengingatClick}
        className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
          <Bell className="w-8 h-8 text-white" fill="currentColor" stroke="currentColor" />
        </div>
        <h3 className="font-semibold text-sm">Pengingat</h3>
      </div>

      {/* Statistik Card */}
      <div 
        onClick={handleStatistikClick}
        className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
          <BarChart3 className="w-8 h-8 text-white" fill="currentColor" stroke="currentColor" />
        </div>
        <h3 className="font-semibold text-sm">Statistik</h3>
      </div>

      {/* Tutorial Card */}
      <div 
        onClick={handleTutorialClick}
        className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
          <HelpCircle className="w-8 h-8 text-white" fill="currentColor" stroke="currentColor" />
        </div>
        <h3 className="font-semibold text-sm">Tutorial</h3>
      </div>
    </div>
  )
}