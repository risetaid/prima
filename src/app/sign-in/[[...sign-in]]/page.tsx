'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Masuk ke PRIMA
            </h1>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              Sistem monitoring pasien kanker paliatif
            </p>
          </div>

          {/* Sign In Form */}
          <div className="flex justify-center">
            <SignIn
              afterSignInUrl="/pasien"
              redirectUrl="/pasien"
              routing="path"
              path="/sign-in"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-xl border-0 bg-white/80 backdrop-blur-sm",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "border-gray-200 hover:bg-gray-50 transition-colors",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 transition-colors",
                  footerActionLink: "text-blue-600 hover:text-blue-700"
                }
              }}
            />
          </div>

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm text-gray-500">
              © 2025 PRIMA - Palliative Remote Integrated Monitoring
            </p>
          </div>
        </div>
      </div>
  )
}
