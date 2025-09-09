export default function Loading() {
  // Loading skeleton for landing page
  return (
    <div className="min-h-screen bg-white relative animate-pulse">
      {/* Background Pattern Skeleton */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gray-100 opacity-90"></div>
      </div>

      {/* Header Skeleton */}
      <header className="bg-white shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center px-4 lg:px-8 py-4">
            {/* Logo Skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="w-20 h-6 bg-gray-300 rounded"></div>
            </div>

            {/* Desktop Navigation Skeleton */}
            <nav className="hidden lg:flex items-center space-x-8">
              <div className="px-3 py-2 rounded-md text-sm font-medium">
                <div className="w-16 h-4 bg-gray-300 rounded"></div>
              </div>
              <div className="px-3 py-2 rounded-md text-sm font-medium">
                <div className="w-12 h-4 bg-gray-300 rounded"></div>
              </div>
              <div className="px-3 py-2 rounded-md text-sm font-medium">
                <div className="w-20 h-4 bg-gray-300 rounded"></div>
              </div>
              <div className="px-3 py-2 rounded-md text-sm font-medium">
                <div className="w-16 h-4 bg-gray-300 rounded"></div>
              </div>
              {/* Pengingat Button Skeleton */}
              <div className="px-4 py-2 rounded-lg font-semibold">
                <div className="w-20 h-4 bg-gray-300 rounded"></div>
              </div>
            </nav>

            {/* User Menu Skeleton */}
            <div className="flex items-center space-x-4">
              <div className="bg-gray-200 px-4 py-2 rounded-lg font-medium">
                <div className="w-12 h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[80vh] text-center py-8">
            {/* Hero Content Skeleton */}
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              {/* Main Title Skeleton */}
              <div className="space-y-2">
                <div className="w-full h-12 sm:h-16 lg:h-20 bg-gray-300 rounded mx-auto max-w-2xl"></div>
                <div className="w-3/4 h-12 sm:h-16 lg:h-20 bg-gray-300 rounded mx-auto"></div>
                <div className="w-1/2 h-12 sm:h-16 lg:h-20 bg-gray-300 rounded mx-auto"></div>
              </div>

              {/* Description Skeleton */}
              <div className="max-w-2xl mx-auto px-4 space-y-3">
                <div className="w-full h-4 bg-gray-300 rounded"></div>
                <div className="w-full h-4 bg-gray-300 rounded"></div>
                <div className="w-full h-4 bg-gray-300 rounded"></div>
                <div className="w-4/5 h-4 bg-gray-300 rounded mx-auto"></div>
                <div className="w-3/4 h-4 bg-gray-300 rounded mx-auto"></div>
                <div className="w-2/3 h-4 bg-gray-300 rounded mx-auto"></div>
              </div>

              {/* CTA Button Skeleton */}
              <div className="flex justify-center items-center pt-6 sm:pt-8">
                <div className="bg-gray-300 px-6 py-3 sm:px-8 sm:py-4 rounded-lg">
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
