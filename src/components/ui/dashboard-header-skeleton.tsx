import { Skeleton } from "@/components/ui/skeleton"

export function DashboardHeaderSkeleton() {
  return (
    <>
      {/* Mobile Navigation Buttons */}
      <div className="lg:hidden bg-blue-500 px-6 py-8 relative z-10">
        <div className="flex space-x-6 justify-center pb-4">
          {Array.from({ length: 3 }).map((value, i) => (
            <div key={i} className="text-center flex-shrink-0 min-w-[80px]">
              <Skeleton className="h-20 w-20 mx-auto mb-3 rounded-lg" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block relative z-10">
        <div className="bg-blue-600 text-white py-6">
          <div className="px-8">
            <div className="flex items-center justify-between">
              {/* Search Bar */}
              <div className="bg-white rounded-lg">
                <Skeleton className="h-12 w-80" />
              </div>
              {/* Patient Count with Add Button */}
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-64 bg-blue-500" />
                <Skeleton className="h-10 w-10 bg-blue-500 rounded-full" />
              </div>
              {/* Filter Buttons */}
              <div className="flex space-x-3">
                <Skeleton className="h-12 w-16 bg-blue-500 rounded-full" />
                <Skeleton className="h-12 w-20 bg-blue-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Status Badge */}
      <div className="lg:hidden mx-4 bg-blue-100 border-2 border-blue-500 text-blue-600 rounded-full px-6 py-3 text-center mb-4 mt-4 relative z-10">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>

      {/* Instant Send Section */}
      <div className="px-4 lg:px-8 mt-6 mb-6 relative z-10">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-400">
          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </>
  )
}