import { Header } from "@/components/ui/header"
import { CMSErrorBoundary } from '@/components/ui/error-boundary'
import { AuthLoading } from '@/components/auth/auth-loading'

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthLoading 
      requireAuth={true} 
      requireApproval={true}
      allowedRoles={['ADMIN', 'SUPERADMIN']}
    >
      <CMSErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Background Pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
              style={{
                backgroundImage: "url(/bg_desktop.png)",
              }}
            />
          </div>

          {/* Header */}
          <Header showNavigation={true} className="relative z-10" />

          {/* Main Content */}
          <main className="relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </CMSErrorBoundary>
    </AuthLoading>
  )
}