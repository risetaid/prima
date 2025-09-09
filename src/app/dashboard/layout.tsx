import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { AuthLoading } from '@/components/auth/auth-loading'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthLoading requireAuth={true} requireApproval={true}>
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </DashboardErrorBoundary>
    </AuthLoading>
  )
}