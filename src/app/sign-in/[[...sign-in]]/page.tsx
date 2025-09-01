import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Masuk ke PRIMA
          </h1>
          <p className="text-gray-600">
            Sistem monitoring pasien kanker paliatif
          </p>
        </div>
        <SignIn 
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg"
            }
          }}
        />
      </div>
    </div>
  )
}