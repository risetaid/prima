export default function ArticleLoading() {
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

      {/* Article content skeleton */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Article header */}
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

            {/* Excerpt */}
            <div className="space-y-2">
              <div className="w-full h-4 bg-gray-300 rounded"></div>
              <div className="w-4/5 h-4 bg-gray-300 rounded"></div>
            </div>

            {/* Meta information */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="w-24 h-4 bg-gray-300 rounded"></div>
              <div className="w-20 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Featured image */}
        <div className="bg-white p-0 rounded-lg shadow-sm">
          <div className="aspect-video w-full bg-gray-300 rounded-lg animate-pulse"></div>
        </div>

        {/* Article content */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-4/5 h-4 bg-gray-300 rounded"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
            <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </main>
    </div>
  )
}