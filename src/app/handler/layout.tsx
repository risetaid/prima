import Link from 'next/link'

export default function HandlerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Custom Header with Back Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="flex items-center text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
        </div>
      </div>
      
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-gray-600">Palliative Remote Integrated Monitoring and Assistance</p>
          </div>
          
          {children}
          
          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-gray-500 font-medium">
              Membantu relawan memberikan perawatan terbaik 💙
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}