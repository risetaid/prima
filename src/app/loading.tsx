export default function Loading() {
  // Loading skeleton for all pages
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="w-20 h-6 bg-gray-300 rounded"></div>
            </div>
            <div className="hidden lg:flex space-x-8">
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <div className="w-3/4 h-8 bg-gray-300 rounded"></div>
          <div className="w-1/2 h-4 bg-gray-300 rounded"></div>
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-2/3 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="w-full h-48 bg-gray-300 rounded"></div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-4/5 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </main>
    </div>
  )
}
