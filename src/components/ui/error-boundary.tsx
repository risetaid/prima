'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Phone, Wifi, WifiOff } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  context?: 'dashboard' | 'cms' | 'patient' | 'reminder' | 'general'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isRetrying: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRetrying: false
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for monitoring
    console.error('🚨 Error Boundary Caught:', {
      error: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace',
      errorType: typeof error,
      errorKeys: Object.keys(error || {}),
      context: this.props.context,
      componentStack: errorInfo.componentStack
    })

    // TODO: Send to error tracking service
    // reportError(error, errorInfo, this.props.context)
  }

  handleRetry = () => {
    if (this.retryCount >= this.maxRetries) {
      return
    }

    this.setState({ isRetrying: true })
    this.retryCount++

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      })
    }, 1000)
  }

  getContextualError() {
    const { context } = this.props
    // const { error } = this.state

    // Healthcare-specific error messages
    const contextualErrors = {
      dashboard: {
        title: 'Beranda Tidak Dapat Dimuat',
        description: 'Terjadi kesalahan saat memuat dashboard utama sistem PRIMA.',
        icon: Home,
        suggestions: [
          'Periksa koneksi internet Anda',
          'Coba refresh halaman',
          'Pastikan Anda telah login dengan benar'
        ]
      },
      cms: {
        title: 'Konten Tidak Dapat Diakses',
        description: 'Sistem manajemen konten mengalami gangguan sementara.',
        icon: AlertTriangle,
        suggestions: [
          'Artikel dan video sedang dimuat ulang',
          'Coba akses kembali dalam beberapa saat',
          'Hubungi administrator jika masalah berlanjut'
        ]
      },
      patient: {
        title: 'Data Pasien Tidak Tersedia',
        description: 'Terjadi kesalahan saat mengakses informasi pasien.',
        icon: AlertTriangle,
        suggestions: [
          'Data pasien mungkin sedang disinkronisasi',
          'Periksa koneksi ke sistem database',
          'Pastikan Anda memiliki akses ke data pasien ini'
        ]
      },
      reminder: {
        title: 'Sistem Pengingat Bermasalah',
        description: 'Pengingat obat tidak dapat diproses saat ini.',
        icon: Phone,
        suggestions: [
          'Koneksi WhatsApp mungkin terputus',
          'Jadwal pengingat akan dipulihkan otomatis',
          'Hubungi tim teknis jika urgent'
        ]
      },
      general: {
        title: 'Terjadi Kesalahan Sistem',
        description: 'Sistem PRIMA mengalami gangguan tak terduga.',
        icon: AlertTriangle,
        suggestions: [
          'Coba muat ulang halaman',
          'Periksa status koneksi internet',
          'Hubungi support jika masalah berlanjut'
        ]
      }
    }

    return contextualErrors[context || 'general']
  }

  isNetworkError() {
    const { error } = this.state
    return error?.message?.includes('fetch') || 
           error?.message?.includes('network') ||
           error?.message?.includes('connection')
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const contextError = this.getContextualError()
      const Icon = contextError.icon
      const isNetwork = this.isNetworkError()
      const canRetry = this.retryCount < this.maxRetries

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  {isNetwork ? (
                    <WifiOff className="h-6 w-6 text-red-600" />
                  ) : (
                    <Icon className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-700">
                    {contextError.title}
                  </h2>
                  {isNetwork && (
                    <p className="text-sm text-orange-600 font-medium">
                      Koneksi Internet Terputus
                    </p>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                {contextError.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Suggestions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Langkah untuk mengatasi:
                </h4>
                <ul className="space-y-2">
                  {contextError.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-600">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Network Status */}
              {isNetwork && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Wifi className="h-4 w-4" />
                    <span className="font-medium">Status Koneksi</span>
                  </div>
                  <p className="text-orange-700 mt-1 text-sm">
                    Periksa koneksi internet dan coba lagi. Data pasien tersimpan aman.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {this.state.isRetrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Memuat Ulang...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Coba Lagi
                      </>
                    )}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Kembali ke Beranda
                </Button>
                
                {this.retryCount >= this.maxRetries && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Muat Ulang Halaman
                  </Button>
                )}
              </div>

              {/* Technical Details (Development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Detail Teknis (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 text-gray-700">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {/* Healthcare Context Footer */}
              <div className="border-t pt-4 text-center">
                <p className="text-sm text-gray-500">
                  <strong>Sistem PRIMA</strong> - Monitoring Paliatif Terintegrasi
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Data pasien aman tersimpan. Hubungi tim teknis jika masalah berlanjut.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper components for specific contexts
export const DashboardErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="dashboard">{children}</ErrorBoundary>
)

export const CMSErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="cms">{children}</ErrorBoundary>
)

export const PatientErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="patient">{children}</ErrorBoundary>
)

export const ReminderErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary context="reminder">{children}</ErrorBoundary>
)