import { Skeleton } from "./skeleton"
import { Card, CardContent, CardHeader } from "./card"
import { DashboardHeaderSkeleton } from "./dashboard-header-skeleton"
import { PatientListSkeleton } from "./patient-list-skeleton"
import { PatientCardSkeleton } from "./patient-card-skeleton"
import { ReminderListSkeleton } from "./reminder-list-skeleton"

// Re-export for backward compatibility
export { DashboardHeaderSkeleton, PatientListSkeleton, PatientCardSkeleton, ReminderListSkeleton }

// Helper Components (keeping some for other skeletons)
function SkeletonCard({ children, className = "bg-white" }: { children: React.ReactNode; className?: string }) {
  return <Card className={className}>{children}</Card>
}

function SkeletonCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <CardHeader className={className}>{children}</CardHeader>
}

function SkeletonCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <CardContent className={className}>{children}</CardContent>
}

function SkeletonAvatar({ size = "h-8 w-8" }: { size?: string }) {
  return <Skeleton className={`${size} rounded-full`} />
}

function SkeletonButton({ width = "w-24", height = "h-10" }: { width?: string; height?: string }) {
  return <Skeleton className={`${height} ${width} rounded`} />
}

function SkeletonText({ lines = 1, widths = ["w-32"] }: { lines?: number; widths?: string[] }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}

function SkeletonFormField({ labelWidth = "w-24", inputWidth = "w-full" }: { labelWidth?: string; inputWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`h-10 ${inputWidth}`} />
    </div>
  )
}

function SkeletonTable({
  columns = 4,
  rows = 5,
  headerWidths = [],
  rowWidths = [],
  customRowRenderer
}: {
  columns?: number;
  rows?: number;
  headerWidths?: string[];
  rowWidths?: string[];
  customRowRenderer?: () => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 py-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${headerWidths[i] || "w-20"}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4 py-3 border-b last:border-0">
          {customRowRenderer ? customRowRenderer() : (
            Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${rowWidths[j] || "w-24"}`} />
            ))
          )}
        </div>
      ))}
    </div>
  )
}

// Dashboard Stats Cards Skeleton
export function DashboardStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((value, i) => (
        <SkeletonCard key={i}>
          <SkeletonCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </SkeletonCardHeader>
          <SkeletonCardContent>
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-32" />
          </SkeletonCardContent>
        </SkeletonCard>
      ))}
    </div>
  )
}

// Navigation Cards Skeleton
export function DashboardNavigationSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: 6 }).map((value, i) => (
        <SkeletonCard key={i} className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <SkeletonCardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          </SkeletonCardContent>
        </SkeletonCard>
      ))}
    </div>
  )
}

// Patient List Table Skeleton
export function PatientListTableSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonCardHeader>
        <div className="flex justify-between items-center">
          <SkeletonText lines={2} widths={["w-32", "w-48"]} />
          <Skeleton className="h-9 w-24" />
        </div>
      </SkeletonCardHeader>
      <SkeletonCardContent>
        <SkeletonTable
          columns={6}
          rows={5}
          headerWidths={["w-16", "w-24", "w-20", "w-18", "w-22", "w-16"]}
          customRowRenderer={() => (
            <>
              <div className="flex items-center space-x-2">
                <SkeletonAvatar size="h-8 w-8" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <div className="flex space-x-2">
                <SkeletonButton width="w-16" height="h-6" />
                <SkeletonButton width="w-16" height="h-6" />
              </div>
            </>
          )}
        />
      </SkeletonCardContent>
    </SkeletonCard>
  )
}

// Form Skeleton for Create/Edit pages
export function FormSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonCardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </SkeletonCardHeader>
      <SkeletonCardContent className="space-y-6">
        {/* Form Fields */}
        {Array.from({ length: 6 }).map((value, i) => (
          <SkeletonFormField key={i} />
        ))}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <SkeletonButton width="w-24" />
          <SkeletonButton width="w-32" />
        </div>
      </SkeletonCardContent>
    </SkeletonCard>
  )
}

// Mobile Optimized Patient Card Skeleton
export function MobilePatientCardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((value, i) => (
        <SkeletonCard key={i}>
          <SkeletonCardContent className="p-4">
            <div className="flex items-start space-x-3">
              <SkeletonAvatar size="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
                <div className="flex gap-2 pt-2">
                  <SkeletonButton width="w-16" height="h-8" />
                  <SkeletonButton width="w-20" height="h-8" />
                </div>
              </div>
            </div>
          </SkeletonCardContent>
        </SkeletonCard>
      ))}
    </div>
  )
}

// Header/Navigation Skeleton
export function HeaderSkeleton() {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-24" />
          </div>

          {/* Navigation */}
          <div className="hidden md:flex space-x-6">
            {Array.from({ length: 4 }).map((value, i) => (
              <Skeleton key={i} className="h-5 w-20" />
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <SkeletonAvatar size="h-8 w-8" />
            <div className="hidden sm:block space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// CMS Content List Skeleton
export function CMSContentListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((value, i) => (
        <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-64" />
              </div>
              <Skeleton className="h-4 w-96" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton width="w-16" height="h-8" />
              <SkeletonButton width="w-16" height="h-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Patient Detail Page Skeleton
export function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Patient Info Card */}
      <SkeletonCard>
        <SkeletonCardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <SkeletonAvatar size="h-16 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonButton width="w-24" height="h-9" />
              <SkeletonButton width="w-20" height="h-9" />
            </div>
          </div>
        </SkeletonCardHeader>
        <SkeletonCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((value, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </SkeletonCardContent>
      </SkeletonCard>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((value, i) => (
          <SkeletonCard key={i} className="bg-white cursor-pointer hover:shadow-md">
            <SkeletonCardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-8" />
                </div>
              </div>
            </SkeletonCardContent>
          </SkeletonCard>
        ))}
      </div>

      {/* Recent Activity */}
      <SkeletonCard>
        <SkeletonCardHeader>
          <Skeleton className="h-5 w-32" />
        </SkeletonCardHeader>
        <SkeletonCardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((value, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </SkeletonCardContent>
      </SkeletonCard>
    </div>
  )
}

// Reminder Form Skeleton
export function ReminderFormSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonCardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </SkeletonCardHeader>
      <SkeletonCardContent className="space-y-6">
        {/* Template Selection */}
        <SkeletonFormField labelWidth="w-32" />

        {/* Message Preview */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="border rounded-lg p-4 bg-gray-50">
            <SkeletonText lines={3} widths={["w-full", "w-3/4", "w-1/2"]} />
          </div>
        </div>

        {/* Schedule Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonFormField labelWidth="w-20" />
          <SkeletonFormField labelWidth="w-16" />
        </div>

        {/* Recurrence Pattern */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((value, i) => (
              <SkeletonButton key={i} width="w-20" height="h-9" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((value, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded" />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <SkeletonButton width="w-24" />
          <SkeletonButton width="w-32" />
        </div>
      </SkeletonCardContent>
    </SkeletonCard>
  )
}

// Admin Users Table Skeleton
export function AdminUsersTableSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonCardHeader>
        <div className="flex justify-between items-center">
          <SkeletonText lines={2} widths={["w-40", "w-56"]} />
          <div className="flex gap-2">
            <SkeletonButton width="w-28" height="h-9" />
            <SkeletonButton width="w-24" height="h-9" />
          </div>
        </div>
      </SkeletonCardHeader>
      <SkeletonCardContent>
        <SkeletonTable
          columns={7}
          rows={6}
          headerWidths={["w-16", "w-20", "w-24", "w-16", "w-20", "w-28", "w-16"]}
          customRowRenderer={() => (
            <>
              <div className="flex items-center space-x-2">
                <SkeletonAvatar size="h-8 w-8" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                <SkeletonButton width="w-16" height="h-6" />
                <SkeletonButton width="w-20" height="h-6" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </>
          )}
        />
      </SkeletonCardContent>
    </SkeletonCard>
  )
}

// Template Management Skeleton
export function TemplateManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <SkeletonText lines={2} widths={["w-48", "w-64"]} />
        <SkeletonButton width="w-32" />
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((value, i) => (
          <SkeletonCard key={i}>
            <SkeletonCardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </SkeletonCardHeader>
            <SkeletonCardContent>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <SkeletonText lines={3} widths={["w-full", "w-3/4", "w-1/2"]} />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </SkeletonCardContent>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

// Settings Page Skeleton
export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <SkeletonCard>
        <SkeletonCardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </SkeletonCardHeader>
        <SkeletonCardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <SkeletonAvatar size="h-16 w-16" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <SkeletonButton width="w-24" height="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {Array.from({ length: 4 }).map((value, i) => (
              <SkeletonFormField key={i} />
            ))}
          </div>
        </SkeletonCardContent>
      </SkeletonCard>

      {/* Preferences Section */}
      <SkeletonCard>
        <SkeletonCardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-56" />
        </SkeletonCardHeader>
        <SkeletonCardContent className="space-y-4">
          {Array.from({ length: 5 }).map((value, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </SkeletonCardContent>
      </SkeletonCard>

      {/* Notification Settings */}
      <SkeletonCard>
        <SkeletonCardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </SkeletonCardHeader>
        <SkeletonCardContent className="space-y-4">
          {Array.from({ length: 3 }).map((value, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <SkeletonButton width="w-16" height="h-8" />
                <SkeletonButton width="w-20" height="h-8" />
                <SkeletonButton width="w-18" height="h-8" />
              </div>
            </div>
          ))}
        </SkeletonCardContent>
      </SkeletonCard>
    </div>
  )
}



// Health Notes Skeleton
export function HealthNotesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonText lines={2} widths={["w-32", "w-48"]} />
        <SkeletonButton width="w-28" height="h-9" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((value, i) => (
          <SkeletonCard key={i}>
            <SkeletonCardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <SkeletonText lines={2} widths={["w-full", "w-3/4"]} />
                  <div className="flex items-center gap-4 text-sm pt-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </SkeletonCardContent>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

// Patient List Mobile Skeleton - for mobile patient cards with search/filters
export function PatientListMobileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-16" />
          </div>
          <SkeletonAvatar size="h-8 w-8" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Search Bar Skeleton */}
        <div className="relative">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Filter Buttons Skeleton */}
        <div className="flex gap-3 overflow-x-auto">
          <SkeletonButton width="w-32" height="h-10" />
          <SkeletonButton width="w-40" height="h-10" />
        </div>

        {/* Results Count */}
        <Skeleton className="h-4 w-48" />

        {/* Patient Cards */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((value, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SkeletonAvatar size="h-12 w-12" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Dashboard Skeleton - matches the exact structure of the dashboard page
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Skeleton className="absolute inset-0" />
      </div>

      <DashboardHeaderSkeleton />
      <PatientListSkeleton />
    </div>
  )
}

// Reminder Page Skeleton - for reminder page with search + patient cards
export function ReminderPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern Skeleton */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Skeleton className="absolute inset-0" />
      </div>

      {/* Desktop Header Skeleton */}
      <div className="hidden lg:block relative z-10">
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="hidden md:flex space-x-6">
                {Array.from({ length: 4 }).map((value, i) => (
                  <Skeleton key={i} className="h-5 w-20" />
                ))}
              </div>
              <SkeletonAvatar size="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header Skeleton */}
      <div className="lg:hidden relative z-10">
        <div className="bg-white">
          <div className="flex justify-between items-center px-4 py-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-16" />
            <SkeletonAvatar size="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Desktop Blue Header Section */}
      <div className="hidden lg:block relative z-10">
        <div className="bg-blue-600 text-white py-6">
          <div className="px-8">
            <div className="flex items-center justify-between">
              {/* Search Bar Skeleton */}
              <div className="bg-white rounded-lg">
                <Skeleton className="h-12 w-80" />
              </div>
              {/* Title Skeleton */}
              <Skeleton className="h-8 w-64 bg-blue-500" />
              {/* Filter Buttons Skeleton */}
              <div className="flex space-x-3">
                <Skeleton className="h-12 w-16 bg-blue-500 rounded-lg" />
                <Skeleton className="h-12 w-20 bg-blue-500 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block px-4 lg:px-8 py-8 relative z-10">
        <SkeletonCard>
          <SkeletonCardContent className="p-6">
            <SkeletonTable
              columns={5}
              rows={6}
              headerWidths={["w-16", "w-24", "w-20", "w-18", "w-16"]}
          customRowRenderer={() => (
                <>
                  <div className="flex items-center space-x-2">
                    <SkeletonAvatar size="h-10 w-10" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <SkeletonButton width="w-20" height="h-8" />
                </>
              )}
            />
          </SkeletonCardContent>
        </SkeletonCard>
      </div>

      {/* Mobile Patient Cards Skeleton */}
      <div className="lg:hidden relative z-10">
        <div className="px-4 py-6">
          {/* Mobile Controls */}
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <SkeletonButton width="w-32" height="h-8" />
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2 mb-4">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>

          {/* Patient Cards */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((value, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <SkeletonAvatar size="h-12 w-12" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

