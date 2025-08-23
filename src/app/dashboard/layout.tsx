import { requireApprovedUser } from '@/lib/auth-utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require approved user to access dashboard
  await requireApprovedUser()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}