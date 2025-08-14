'use client'

export default function IconTestPage() {
  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-2xl mb-8">Icon Test - Different Approaches</h1>
      
      {/* Test 1: Simple black SVG */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 1: Black SVG</h2>
        <div className="bg-gray-100 p-4 inline-block">
          <svg className="w-8 h-8" fill="black" viewBox="0 0 24 24">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="m13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>
      
      {/* Test 2: White SVG on blue background */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 2: White SVG on Blue</h2>
        <div className="bg-blue-500 p-4 inline-block">
          <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="m13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>
      
      {/* Test 3: Using stroke instead of fill */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 3: Stroke White</h2>
        <div className="bg-blue-500 p-4 inline-block">
          <svg className="w-8 h-8" stroke="white" fill="none" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="m13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>
      
      {/* Test 4: Exact dashboard replica */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 4: Dashboard Replica</h2>
        <div className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg" style={{ width: '120px' }}>
          <div className="bg-white bg-opacity-20 rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
            <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="m13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3 className="font-semibold text-sm">Pengingat</h3>
        </div>
      </div>

      {/* Test 5: CSS background approach */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 5: CSS Background</h2>
        <div className="bg-blue-500 p-4 inline-block">
          <div 
            className="w-8 h-8 bg-white" 
            style={{
              mask: `url("data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="m13.73 21a2 2 0 0 1-3.46 0"/></svg>')}")`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            }}
          />
        </div>
      </div>

      {/* Test 6: Inline SVG content */}
      <div className="mb-8">
        <h2 className="text-lg mb-4">Test 6: Direct HTML</h2>
        <div className="bg-blue-500 p-4 inline-block">
          <div className="w-8 h-8 text-white" dangerouslySetInnerHTML={{
            __html: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="m13.73 21a2 2 0 0 1-3.46 0"/></svg>`
          }} />
        </div>
      </div>

      <div className="mt-8">
        <a href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">Back to Dashboard</a>
      </div>
    </div>
  )
}