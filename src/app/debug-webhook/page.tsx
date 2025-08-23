'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Webhook, Copy, Trash2 } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

interface WebhookLog {
  id: string
  timestamp: string
  data: any
}

export default function DebugWebhookPage() {
  const router = useRouter()
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [isListening, setIsListening] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('/api/webhooks/debug-webhook')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/debug-webhook`)
    }
  }, [])

  // Don't render until component is mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading debug webhook...</p>
        </div>
      </div>
    )
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    alert('Webhook URL copied to clipboard!')
  }

  const clearLogs = () => {
    setWebhookLogs([])
  }

  // Simulate webhook data for demo (in real app, this would come from server-sent events or polling)
  const addMockWebhook = () => {
    const mockResponses = [
      'MINUM',
      'SUDAH',
      'BELUM',
      'BANTUAN',
      'Sudah minum obat pagi ini',
      'Lupa minum obat kemarin',
      'Terima kasih remindernya'
    ]
    
    const mockData = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      data: {
        // Fonnte webhook format
        device: '628594257362',
        sender: '6281333852187',
        message: mockResponses[Math.floor(Math.random() * mockResponses.length)],
        member: null,
        name: 'David Yusaku',
        location: null,
        messageType: 'text',
        provider: 'fonnte',
        receivedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      }
    }
    setWebhookLogs(prev => [mockData, ...prev].slice(0, 20)) // Keep only last 20 logs
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Debug Webhook</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-6xl mx-auto">
        
        {/* Webhook URL */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Webhook className="w-5 h-5 mr-2 text-green-600" />
            Webhook Endpoint
          </h2>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-1 bg-gray-100 rounded-lg p-3 font-mono text-sm">
              {webhookUrl}
            </div>
            <Button 
              onClick={copyWebhookUrl}
              variant="outline" 
              size="sm"
              className="cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">📡 Fonnte Setup</p>
              <p className="text-blue-700">Webhook URL → Device Settings → Message Event</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="font-medium text-purple-800 mb-1">🔵 Twilio Setup</p>
              <p className="text-purple-700">Console → WhatsApp → Webhook URL</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Button 
                onClick={addMockWebhook}
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                + Add Mock Data
              </Button>
              <span className="text-sm text-gray-600">
                Total logs: {webhookLogs.length}
              </span>
            </div>
            
            <Button 
              onClick={clearLogs}
              variant="outline" 
              size="sm"
              className="cursor-pointer text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear Logs
            </Button>
          </div>
        </div>

        {/* Webhook Logs */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">📱 Incoming Messages</h2>
          
          {webhookLogs.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow-sm text-center">
              <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No webhook messages received yet</p>
              <p className="text-sm text-gray-400">
                Configure your WhatsApp provider to send webhooks to the URL above
              </p>
            </div>
          ) : (
            webhookLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="font-medium text-gray-900">New Message</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {log.timestamp}
                  </span>
                </div>
                
                <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-medium text-amber-800 mb-3">🛠️ Setup Instructions</h3>
          <div className="space-y-2 text-sm text-amber-700">
            <p><strong>1. Copy webhook URL</strong> dari atas</p>
            <p><strong>2. Fonnte:</strong> Login → Device → Message Event → Paste URL</p>
            <p><strong>3. Twilio:</strong> Console → Messaging → WhatsApp → Webhook URL</p>
            <p><strong>4. Test:</strong> Kirim WhatsApp ke nomor bot → Lihat log di sini</p>
          </div>
        </div>
      </main>
    </div>
  )
}