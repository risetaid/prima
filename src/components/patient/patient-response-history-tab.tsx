'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatDateTimeWIB } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Download, Filter, MessageSquare, Search, Activity, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface PatientResponseHistoryTabProps {
  patientId: string
  patientName: string
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
}

interface ResponseAnalytics {
  totalResponses: number
  thisWeekResponses: number
  thisMonthResponses: number
  averageResponseTime: number
  responseRateByType: Record<string, number>
  mostCommonClassification: string
  unrecognizedRate: number
}

export default function PatientResponseHistoryTab({ 
  patientId, 
  patientName 
}: PatientResponseHistoryTabProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterClassification, setFilterClassification] = useState<string>('all')
  const [filterDirection, setFilterDirection] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null)

  const itemsPerPage = 20

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/patients/${patientId}/verification-history`)
      const data = await response.json()

      if (response.ok) {
        setHistory(data.history || [])
        calculateAnalytics(data.history || [])
      } else {
        setError(data.error || 'Failed to load history')
      }
    } catch (error) {
      logger.error('Failed to load patient response history', error as Error)
      setError('Failed to load history')
    }

    setLoading(false)
  }, [patientId])

  const calculateAnalytics = (entries: HistoryEntry[]) => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const thisWeek = entries.filter(entry => new Date(entry.timestamp) >= oneWeekAgo)
    const thisMonth = entries.filter(entry => new Date(entry.timestamp) >= oneMonthAgo)
    const inboundEntries = entries.filter(entry => entry.direction === 'inbound')

    const responseTimes = inboundEntries
      .filter(entry => entry.processingTime)
      .map(entry => entry.processingTime!)

    const classificationCounts = entries.reduce((acc, entry) => {
      if (entry.classification) {
        acc[entry.classification] = (acc[entry.classification] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const mostCommonClassification = Object.entries(classificationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

    const unrecognizedCount = entries.filter(entry => 
      entry.intent === 'unrecognized' || entry.classification === 'Tidak dikenali'
    ).length

    setAnalytics({
      totalResponses: entries.length,
      thisWeekResponses: thisWeek.length,
      thisMonthResponses: thisMonth.length,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      responseRateByType: classificationCounts,
      mostCommonClassification,
      unrecognizedRate: entries.length > 0 ? (unrecognizedCount / entries.length) * 100 : 0
    })
  }

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      // Search filter
      if (searchTerm && !entry.message?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !entry.action.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Type filter
      if (filterType !== 'all' && entry.messageType !== filterType) {
        return false
      }

      // Classification filter
      if (filterClassification !== 'all' && entry.classification !== filterClassification) {
        return false
      }

      // Direction filter
      if (filterDirection !== 'all' && entry.direction !== filterDirection) {
        return false
      }

      return true
    })
  }, [history, searchTerm, filterType, filterClassification, filterDirection])

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredHistory.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredHistory, currentPage])

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)

  const getActionIcon = (action: string) => {
    if (action.includes('📱')) return <MessageSquare className="w-4 h-4" />
    if (action.includes('✅')) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (action.includes('❌')) return <XCircle className="w-4 h-4 text-red-600" />
    if (action.includes('⏰')) return <Clock className="w-4 h-4 text-blue-600" />
    if (action.includes('❓')) return <AlertCircle className="w-4 h-4 text-orange-600" />
    return <Activity className="w-4 h-4" />
  }

  const getClassificationBadge = (classification?: string) => {
    if (!classification) return null
    
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
    
    const colorClass = colors[classification as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    
    return (
      <Badge variant="secondary" className={colorClass}>
        {classification}
      </Badge>
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

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Aksi', 'Tipe', 'Klasifikasi', 'Pesan', 'Arah', 'Waktu Pemrosesan']
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(entry => [
        formatDateTimeWIB(new Date(entry.timestamp)),
        entry.action,
        entry.messageType || '',
        entry.classification || '',
        `"${(entry.message || '').replace(/"/g, '""')}"`,
        entry.direction || '',
        getProcessingTimeDisplay(entry.processingTime) || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `riwayat_respon_${patientName}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Respon Pasien</h2>
          <p className="text-gray-600 mt-1">{patientName} • Semua interaksi WhatsApp</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Respon</p>
                  <p className="text-2xl font-bold">{analytics.totalResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Minggu Ini</p>
                  <p className="text-2xl font-bold">{analytics.thisWeekResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Rata-rata Waktu</p>
                  <p className="text-2xl font-bold">{getProcessingTimeDisplay(analytics.averageResponseTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Tidak Dikenali</p>
                  <p className="text-2xl font-bold">{analytics.unrecognizedRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari pesan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipe Pesan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="verification">Verifikasi</SelectItem>
                <SelectItem value="reminder">Pengingat</SelectItem>
                <SelectItem value="confirmation">Konfirmasi</SelectItem>
                <SelectItem value="general">Umum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger>
                <SelectValue placeholder="Klasifikasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Klasifikasi</SelectItem>
                <SelectItem value="Diterima">Diterima</SelectItem>
                <SelectItem value="Ditolak">Ditolak</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
                <SelectItem value="Belum">Belum</SelectItem>
                <SelectItem value="Tidak dikenali">Tidak Dikenali</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDirection} onValueChange={setFilterDirection}>
              <SelectTrigger>
                <SelectValue placeholder="Arah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Arah</SelectItem>
                <SelectItem value="inbound">Masuk</SelectItem>
                <SelectItem value="outbound">Keluar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Menampilkan {paginatedHistory.length} dari {filteredHistory.length} riwayat
        </p>
        <Button variant="outline" size="sm" onClick={loadHistory}>
          Refresh
        </Button>
      </div>

      {/* History List */}
      {loading ? (
        null
      ) : error ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-red-500">❌ {error}</p>
              <Button onClick={loadHistory} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : paginatedHistory.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada riwayat respon pasien</p>
              <p className="text-gray-400 text-sm mt-1">
                Riwayat akan muncul setelah pasien mengirim pesan pertama
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedHistory.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActionIcon(entry.action)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{entry.action}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTimeWIB(new Date(entry.timestamp))}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {getClassificationBadge(entry.classification)}
                        {entry.direction === 'inbound' && entry.processingTime && (
                          <Badge variant="outline" className="text-xs">
                            ⚡ {getProcessingTimeDisplay(entry.processingTime)}
                          </Badge>
                        )}
                        {entry.direction === 'inbound' && entry.confidence !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            🎯 {entry.confidence}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Message */}
                    {entry.message && (
                      <div className={`p-3 rounded text-sm ${
                        entry.direction === 'outbound' 
                          ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                          : 'bg-green-50 text-green-900 border border-green-200'
                      }`}>
                        <strong>
                          {entry.direction === 'outbound' ? 'Pesan Terkirim:' : 'Respon Pasien:'}
                        </strong>
                        <div className="mt-1">{entry.message}</div>
                      </div>
                    )}
                    
                    {/* Metadata */}
                    {(entry.context || entry.relatedEntityType || entry.intent) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entry.context && (
                          <Badge variant="outline" className="text-xs">
                            Konteks: {entry.context}
                          </Badge>
                        )}
                        {entry.relatedEntityType && (
                          <Badge variant="outline" className="text-xs">
                            Tipe: {entry.relatedEntityType}
                          </Badge>
                        )}
                        {entry.intent && entry.intent !== 'unrecognized' && (
                          <Badge variant="outline" className="text-xs">
                            Intent: {entry.intent}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
