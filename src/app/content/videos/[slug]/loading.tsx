export default function VideoLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      </header>

      {/* Video content skeleton */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Video header */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="space-y-4">
            {/* Category and tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-16 h-6 bg-gray-300 rounded"></div>
              <div className="w-12 h-4 bg-gray-300 rounded"></div>
              <div className="w-12 h-4 bg-gray-300 rounded"></div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="w-4/5 h-8 bg-gray-300 rounded"></div>
              <div className="w-3/5 h-8 bg-gray-300 rounded"></div>
            </div>

            {/* Meta information */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="w-24 h-4 bg-gray-300 rounded"></div>
              <div className="w-20 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Video player */}
        <div className="bg-white p-0 rounded-lg shadow-sm">
          <div className="relative aspect-video w-full bg-gray-300 rounded-lg animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-500 rounded triangle-right"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Video description */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="w-32 h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-4/5 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Tips section */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="w-28 h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-300 rounded mt-0.5"></div>
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-gray-300 rounded"></div>
                <div className="w-full h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-300 rounded mt-0.5"></div>
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-gray-300 rounded"></div>
                <div className="w-full h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-300 rounded mt-0.5"></div>
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-gray-300 rounded"></div>
                <div className="w-full h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
