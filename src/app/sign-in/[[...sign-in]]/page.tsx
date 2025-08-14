'use client'

import { SignIn } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Page() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard if already signed in
    if (isLoaded && user) {
      router.push('/dashboard')
    }
  }, [isLoaded, user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Integrated Sign In Component */}
        <SignIn
          afterSignInUrl="/dashboard"
          redirectUrl="/dashboard"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white rounded-2xl shadow-xl border-0 p-8 w-full",
              header: "mb-6",
              headerTitle: "text-3xl font-bold text-gray-800 mb-2",
              headerSubtitle: "text-gray-600 text-base",
              socialButtonsBlockButton: "bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 rounded-lg py-3 text-gray-700 font-medium",
              socialButtonsBlockButtonText: "font-medium",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-500 text-sm",
              formFieldInput: "border-2 border-gray-200 focus:border-blue-500 rounded-lg py-3 px-4 text-gray-700 bg-gray-50 focus:bg-white transition-colors",
              formFieldLabel: "text-gray-700 font-medium mb-2",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 rounded-lg py-3 px-6 text-white font-medium transition-colors shadow-md hover:shadow-lg",
              footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
              identityPreviewEditButton: "text-blue-600 hover:text-blue-700",
            },
            layout: {
              logoImageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMjAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjEwMCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzQjgyRjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIj5QUklNQTwvdGV4dD48L3N2Zz4=",
              showOptionalFields: false,
            }
          }}
        />
        
        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500 font-medium">
            Palliative Remote Integrated Monitoring and Assistance
          </p>
          <p className="text-xs text-gray-400">
            Membantu relawan memberikan perawatan terbaik 💙
          </p>
        </div>
      </div>
    </div>
  )
}