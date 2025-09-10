"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

interface GridTableProps {
  headers: string[]
  data: Array<{
    id: string
    cells: React.ReactNode[]
    onClick?: (id: string) => void
    className?: string
  }>
  loading: boolean
  emptyMessage?: string
  buttonText?: string
  routePrefix?: string
}

export function GridTable({
  headers,
  data,
  loading,
  emptyMessage = "No data available",
  buttonText = "Detail",
  routePrefix = "/dashboard/pasien"
}: GridTableProps) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const handleRowClick = (id: string) => {
    if (routePrefix) {
      router.push(`${routePrefix}/${id}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="grid grid-cols-{headers.length} px-6 py-4 font-medium text-center">
          {headers.map((header, index) => (
            <div key={index}>{header}</div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-lg">{emptyMessage}</p>
          </div>
        ) : (
          data.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-${headers.length} px-6 py-4 items-center hover:bg-gray-50 transition-colors ${row.onClick ? 'cursor-pointer' : ''}`}
              onClick={() => row.onClick && handleRowClick(row.id)}
            >
              {row.cells.map((cell, index) => (
                <div key={index} className="text-center">
                  {cell}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}