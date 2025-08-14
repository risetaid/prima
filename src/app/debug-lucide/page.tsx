'use client'

import { Bell, BarChart3, HelpCircle, User, Settings, Home, Plus } from 'lucide-react'

export default function DebugLucidePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Debug Lucide Icons - Step by Step</h1>
      
      {/* Test 1: Simple Icons with Different Colors */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Test 1: Basic Icons</h2>
        <div className="flex gap-4">
          <Bell className="w-8 h-8 text-black" />
          <BarChart3 className="w-8 h-8 text-blue-500" />
          <HelpCircle className="w-8 h-8 text-red-500" />
        </div>
      </div>
      
      {/* Test 2: Icons in Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Test 2: Icons in White Cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border-2 border-gray-300 p-4 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-black" />
            <p className="text-black">Bell Black</p>
          </div>
          <div className="bg-white border-2 border-gray-300 p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-black">Chart Blue</p>
          </div>
          <div className="bg-white border-2 border-gray-300 p-4 text-center">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-black">Help Red</p>
          </div>
        </div>
      </div>
      
      {/* Test 3: Icons in Blue Cards (Like Dashboard) */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Test 3: Icons in Blue Cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500 text-white p-4 text-center rounded-lg">
            <Bell className="w-8 h-8 mx-auto mb-2 text-white" />
            <p>Bell White</p>
          </div>
          <div className="bg-blue-500 text-white p-4 text-center rounded-lg">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-white" />
            <p>Chart White</p>
          </div>
          <div className="bg-blue-500 text-white p-4 text-center rounded-lg">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-white" />
            <p>Help White</p>
          </div>
        </div>
      </div>
      
      {/* Test 4: Different Icon Styles */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Test 4: Different Icons & Styles</h2>
        <div className="flex flex-wrap gap-4">
          <User className="w-8 h-8 text-green-500" />
          <Settings className="w-8 h-8 text-purple-500" />
          <Home className="w-8 h-8 text-orange-500" />
          <Plus className="w-8 h-8 text-pink-500" />
        </div>
      </div>
      
      {/* Test 5: Console Log Check */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Test 5: Console Check</h2>
        <button 
          onClick={() => {
            console.log('Bell component:', Bell)
            console.log('BarChart3 component:', BarChart3)
            console.log('HelpCircle component:', HelpCircle)
          }}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Log Icons to Console
        </button>
      </div>
      
      <div className="mt-6">
        <a href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">Back to Dashboard</a>
      </div>
    </div>
  )
}