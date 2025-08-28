'use client'

export function CancerRibbonBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Background Pattern - matching mockup style */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-teal-50">
        
        {/* Top Left Ribbon */}
        <div className="absolute top-8 left-8 w-32 h-48 opacity-60">
          <svg viewBox="0 0 100 150" className="w-full h-full text-blue-500">
            <path 
              d="M30 20 C20 15, 15 25, 20 35 L20 120 C20 130, 30 140, 40 135 L60 125 C70 120, 80 130, 85 140 L85 145 C85 150, 80 155, 75 150 L25 130 C15 125, 10 115, 15 105 L15 25 C15 15, 25 10, 30 20 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Top Right Elements */}
        <div className="absolute top-12 right-16 w-24 h-24 opacity-40">
          <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
            <g transform="translate(50,50)">
              {Array.from({ length: 12 }).map((_, i) => (
                <g key={i} transform={`rotate(${i * 30})`}>
                  <ellipse cx="0" cy="-25" rx="4" ry="15" fill="currentColor" />
                </g>
              ))}
              <circle cx="0" cy="0" r="6" fill="white" />
            </g>
          </svg>
        </div>

        {/* Bottom Left Flower */}
        <div className="absolute bottom-16 left-12 w-32 h-32 opacity-50">
          <svg viewBox="0 0 100 100" className="w-full h-full text-blue-600">
            <g transform="translate(50,50)">
              {Array.from({ length: 8 }).map((_, i) => (
                <g key={i} transform={`rotate(${i * 45})`}>
                  <ellipse cx="0" cy="-30" rx="6" ry="20" fill="currentColor" />
                </g>
              ))}
              <circle cx="0" cy="0" r="8" fill="white" />
            </g>
          </svg>
        </div>

        {/* Bottom Right Ribbon */}
        <div className="absolute bottom-8 right-8 w-40 h-56 opacity-60">
          <svg viewBox="0 0 120 180" className="w-full h-full text-blue-500">
            <path 
              d="M80 30 C90 25, 95 35, 90 45 L90 140 C90 150, 80 160, 70 155 L50 145 C40 140, 30 150, 25 160 L25 165 C25 170, 30 175, 35 170 L85 150 C95 145, 100 135, 95 125 L95 35 C95 25, 85 20, 80 30 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Center Decorative Elements */}
        <div className="absolute top-32 right-1/3 w-16 h-16 opacity-30">
          <svg viewBox="0 0 100 100" className="w-full h-full text-teal-400">
            <g transform="translate(50,50)">
              {Array.from({ length: 10 }).map((_, i) => (
                <g key={i} transform={`rotate(${i * 36})`}>
                  <ellipse cx="0" cy="-20" rx="3" ry="12" fill="currentColor" />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Additional small elements */}
        <div className="absolute top-1/3 left-1/4 w-12 h-12 opacity-25">
          <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
            <g transform="translate(50,50)">
              {Array.from({ length: 6 }).map((_, i) => (
                <g key={i} transform={`rotate(${i * 60})`}>
                  <ellipse cx="0" cy="-15" rx="2" ry="8" fill="currentColor" />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Subtle wave patterns */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 300">
            <path 
              d="M0,100 C100,80 200,120 300,100 C350,90 400,110 400,100 L400,200 C300,180 200,220 100,200 C50,190 0,210 0,200 Z"
              fill="url(#wave-gradient)"
            />
            <defs>
              <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
                <stop offset="50%" stopColor="rgb(16, 185, 129)" stopOpacity="0.05" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}