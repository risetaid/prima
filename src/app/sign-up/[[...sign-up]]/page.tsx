'use client'

import { SignUp, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // If user is already signed in, redirect to dashboard
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Daftar ke PRIMA
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            Bergabunglah dengan sistem monitoring pasien kanker paliatif
          </p>
        </div>

        {/* Sign Up Form */}
        <div className="flex justify-center">
          <SignUp
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
            redirectUrl="/dashboard"
            routing="path"
            path="/sign-up"
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