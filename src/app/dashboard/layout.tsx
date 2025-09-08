import { DashboardErrorBoundary } from '@/components/ui/error-boundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </DashboardErrorBoundary>
  )
}