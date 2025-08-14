import { Bell, BarChart3, HelpCircle, Plus, User, Settings } from 'lucide-react'

export default function DebugIconsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Lucide Icons</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
          <Bell className="w-8 h-8 mx-auto mb-2" />
          <p>Bell</p>
        </div>
        
        <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p>BarChart3</p>
        </div>
        
        <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
          <HelpCircle className="w-8 h-8 mx-auto mb-2" />
          <p>HelpCircle</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 border rounded">
          <Plus className="w-6 h-6" />
          <span>Plus Icon</span>
        </div>
        
        <div className="flex items-center gap-4 p-4 border rounded">
          <User className="w-6 h-6" />
          <span>User Icon</span>
        </div>
        
        <div className="flex items-center gap-4 p-4 border rounded">
          <Settings className="w-6 h-6" />
          <span>Settings Icon</span>
        </div>
      </div>
      
      <div className="mt-6">
        <a href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">Back to Dashboard</a>
      </div>
    </div>
  )
}