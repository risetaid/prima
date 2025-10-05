'use client'

import { useState, useEffect, useCallback } from 'react'

import { formatDateTimeWIB } from '@/lib/datetime'
import { logger } from '@/lib/logger'

interface VerificationHistoryProps {
  patientId: string
}

interface HistoryEntry {
  id: string
  timestamp: string
  action: string
  message?: string
  response?: string
  result?: string
  classification?: string
  messageType?: string
  intent?: string
  confidence?: number
  context?: string
  expectedResponseType?: string
  relatedEntityType?: string
  processingTime?: number
  direction?: 'inbound' | 'outbound'
  processedBy?: {
    id: string
    name: string
    email: string
  }
}

export default function VerificationHistory({ patientId }: VerificationHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    if (!showHistory || history.length > 0) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/patients/${patientId}/verification-history`)
      const data = await response.json()

      if (response.ok) {
        setHistory(data.history || [])
      } else {
        setError(data.error || 'Failed to load history')
      }
    } catch (error) {
      logger.error('Failed to load verification history', error as Error)
      setError('Failed to load verification history')
    }

    setLoading(false)
  }, [showHistory, history.length, patientId])

  useEffect(() => {
    if (showHistory) {
      loadHistory()
    }
  }, [showHistory, loadHistory])

  const handleToggle = () => {
    setShowHistory(!showHistory)
  }

  const getActionIcon = (action: string) => {
    if (action.includes('📱')) return '📱'
    if (action.includes('✅')) return '✅'  
    if (action.includes('❌')) return '❌'
    if (action.includes('👤')) return '👤'
    if (action.includes('⏰')) return '⏰'
    if (action.includes('💬')) return '💬'
    if (action.includes('❓')) return '❓'
    return '📝'
  }

  const getClassificationBadge = (entry: HistoryEntry) => {
    if (!entry.classification) return null
    
    const colors = {
      'Verifikasi': 'bg-blue-100 text-blue-800',
      'Pengingat': 'bg-yellow-100 text-yellow-800',
      'Konfirmasi': 'bg-green-100 text-green-800',
      'Diterima': 'bg-green-100 text-green-800',
      'Ditolak': 'bg-red-100 text-red-800',
      'Selesai': 'bg-emerald-100 text-emerald-800',
      'Belum': 'bg-orange-100 text-orange-800',
      'Tidak dikenali': 'bg-gray-100 text-gray-800',
      'Umum': 'bg-gray-100 text-gray-800'
    }
    
    const colorClass = colors[entry.classification as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {entry.classification}
      </span>
    )
  }

  const getProcessingTimeDisplay = (processingTime?: number) => {
    if (!processingTime) return null
    
    if (processingTime < 1000) {
      return `${processingTime}ms`
    } else {
      return `${(processingTime / 1000).toFixed(1)}s`
    }
  }

  return (
    <div className="verification-history">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">Riwayat Respon Pasien</h4>
            {history.length > 0 && (
              <span className="text-xs text-gray-500">{history.length} entri</span>
            )}
          </div>
        </div>
        
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showHistory && (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-gray-500">Loading riwayat respon...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">❌ {error}</p>
              <button 
                onClick={loadHistory}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Coba lagi
              </button>
            </div>
          ) : history.length === 0 ? (
             <div className="text-center py-8">
               <p className="text-gray-500 text-sm">📝 Belum ada riwayat respon pasien</p>
               <p className="text-gray-400 text-xs mt-1">
                 Riwayat akan muncul setelah pasien mengirim pesan pertama
               </p>
             </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {/* Timeline connector */}
                  {index !== history.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    {/* Action icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-lg">
                        {getActionIcon(entry.action)}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {entry.action}
                          </h5>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {formatDateTimeWIB(new Date(entry.timestamp))}
                            </p>
                            
                            {/* Classification badge */}
                            {getClassificationBadge(entry)}
                            
                            {/* Processing time for inbound messages */}
                            {entry.direction === 'inbound' && entry.processingTime && (
                              <span className="text-xs text-gray-400">
                                ⚡ {getProcessingTimeDisplay(entry.processingTime)}
                              </span>
                            )}
                            
                            {/* Confidence score for inbound messages */}
                            {entry.direction === 'inbound' && entry.confidence !== undefined && (
                              <span className="text-xs text-gray-400">
                                🎯 {entry.confidence}%
                              </span>
                            )}
                          </div>
                          
                          {entry.processedBy && (
                            <p className="text-xs text-blue-600 mt-1">
                              oleh {entry.processedBy.name}
                            </p>
                          )}
                        </div>
                        
                        {entry.result && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.result === 'verified' ? 'bg-green-100 text-green-800' :
                            entry.result === 'declined' ? 'bg-red-100 text-red-800' :
                            entry.result === 'expired' ? 'bg-orange-100 text-orange-800' :
                            entry.result === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            entry.result === 'missed' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.result}
                          </span>
                        )}
                      </div>
                      
                      {/* Enhanced message content */}
                      {entry.message && (
                        <div className={`mt-2 p-2 rounded text-xs ${
                          entry.direction === 'outbound' 
                            ? 'bg-blue-50 text-blue-900' 
                            : 'bg-green-50 text-green-900'
                        }`}>
                          <strong>{entry.direction === 'outbound' ? 'Pesan Terkirim:' : 'Respon Pasien:'}</strong> {entry.message.substring(0, 150)}
                          {entry.message.length > 150 && '...'}
                        </div>
                      )}
                      
                      {/* Additional metadata */}
                      {(entry.context || entry.relatedEntityType || entry.intent) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.context && (
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                              Konteks: {entry.context}
                            </span>
                          )}
                          {entry.relatedEntityType && (
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                              Tipe: {entry.relatedEntityType}
                            </span>
                          )}
                          {entry.intent && entry.intent !== 'unrecognized' && (
                            <span className="text-xs text-purple-500 bg-purple-50 px-2 py-1 rounded">
                              Intent: {entry.intent}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
