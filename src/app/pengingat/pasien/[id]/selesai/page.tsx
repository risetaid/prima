'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

import { logger } from '@/lib/logger';

interface CompletedReminder {
  id: string
  scheduledTime: string
  reminderDate: string
  customMessage?: string
  confirmationStatus?: string
  confirmedAt: string
  sentAt?: string
  manuallyConfirmed?: boolean
}

interface PaginationMetadata {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function CompletedRemindersPage() {
  const router = useRouter()
  const params = useParams()
  const [reminders, setReminders] = useState<CompletedReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchCompletedReminders(params.id as string, currentPage)
    }
  }, [params.id, currentPage])

  const fetchCompletedReminders = async (patientId: string, page: number) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/reminders?filter=completed&page=${page}&limit=10`)
      if (response.ok) {
        const result = await response.json()
        const responseData = result.data || result
        
        if (responseData.data && responseData.pagination) {
          const data = responseData.data
          logger.info('✅ Completed reminders response (paginated):', { page, count: data.length, total: responseData.pagination.total })
          const normalized = Array.isArray(data)
            ? data.map((item) => ({
                ...item,
                manuallyConfirmed: Boolean(item.manuallyConfirmed),
              }))
            : []
          setReminders(normalized as CompletedReminder[])
          setPagination(responseData.pagination)
        } else {
          logger.error('Invalid response format from pagination API')
          setReminders([])
          setPagination(null)
        }
      } else {
        logger.error('Failed to fetch completed reminders')
        setReminders([])
        setPagination(null)
      }
    } catch (error: unknown) {
      logger.error('Error fetching completed reminders:', error instanceof Error ? error : new Error(String(error)))
      setReminders([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (pagination?.hasPreviousPage) {
      setCurrentPage(currentPage - 1)
    }
  }



  const formatShortDateTime = (isoString: string) => {
    if (!isoString || isoString === "null" || isoString === "undefined") {
      return "Tanggal tidak tersedia";
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "Tanggal tidak valid";
    }

    // isoString already converted to WIB in API
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} - ${hours}.${minutes}`
  }

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white">
        <div className="flex justify-between items-center px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-blue-600" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

       {/* Main Content */}
       <main className="px-4 py-6">
         <div className="flex items-center space-x-2 mb-6">
           <CheckSquare className="w-5 h-5 text-gray-700" />
           <h2 className="text-lg font-semibold text-gray-900">Selesai</h2>
         </div>

         {/* Reminders List */}
         <div className="space-y-4">
           {reminders.map((reminder) => (
             <div key={reminder.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                {/* Main Card */}
                <div className="bg-gray-50 p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {reminder.customMessage || `Minum obat`}
                    </h3>
                    <p className="text-gray-600 text-sm mb-1">
                      Dikirim pada: {formatShortDateTime(reminder.sentAt || reminder.reminderDate)}
                    </p>
                   <p className="text-gray-600 text-sm">
                     Diperbarui pada: {formatShortDateTime(reminder.confirmedAt)}
                   </p>
                   {reminder.manuallyConfirmed && (
                     <p className="text-xs text-green-600 mt-1">
                       Dikonfirmasi secara manual oleh relawan
                     </p>
                   )}
                 </div>
               </div>

               {/* Status Button */}
               <div className="p-0">
                 <div className={`w-full py-3 text-center font-semibold text-white ${
                   reminder.confirmationStatus === 'CONFIRMED'
                     ? 'bg-green-500' 
                     : 'bg-red-500'
                 }`}>
                   {reminder.confirmationStatus === 'CONFIRMED' ? 'Dikonfirmasi' : 'Tidak Dikonfirmasi'}
                 </div>
               </div>
             </div>
           ))}

           {reminders.length === 0 && (
             <div className="text-center py-8">
               <p className="text-gray-500">Belum ada pengingat yang selesai</p>
             </div>
           )}
         </div>

         {/* Pagination Controls */}
         {pagination && pagination.total > 0 && (
           <div className="mt-8 flex items-center justify-between">
             <button
               onClick={handlePreviousPage}
               disabled={!pagination.hasPreviousPage || loading}
               className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                 pagination.hasPreviousPage && !loading
                   ? 'bg-blue-600 text-white hover:bg-blue-700'
                   : 'bg-gray-300 text-gray-500 cursor-not-allowed'
               }`}
             >
               <ChevronLeft className="w-5 h-5" />
               <span>Sebelumnya</span>
             </button>

             <div className="text-sm font-medium text-gray-700">
               Halaman {pagination.page} dari {pagination.totalPages}
             </div>

             <button
               onClick={handleNextPage}
               disabled={!pagination.hasNextPage || loading}
               className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                 pagination.hasNextPage && !loading
                   ? 'bg-blue-600 text-white hover:bg-blue-700'
                   : 'bg-gray-300 text-gray-500 cursor-not-allowed'
               }`}
             >
               <span>Selanjutnya</span>
               <ChevronRight className="w-5 h-5" />
             </button>
           </div>
         )}

       </main>
    </div>
  )
}
