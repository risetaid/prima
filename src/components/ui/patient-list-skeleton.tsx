import { Skeleton } from "./skeleton"
import { SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonTable, SkeletonAvatar, SkeletonButton, SkeletonText } from "./skeleton-factory"
import { PatientCardSkeleton } from "./patient-card-skeleton"

export function PatientListSkeleton() {
  return (
    <div className="px-4 lg:px-8 pb-6 relative z-10">
      {/* Mobile: Title Row */}
      <div className="lg:hidden mb-4">
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>

      {/* Mobile: Controls Row */}
      <div className="lg:hidden flex items-center space-x-4 mb-6">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      </div>

      {/* Mobile: Filter Buttons */}
      <div className="lg:hidden flex space-x-4 mb-6">
        <Skeleton className="h-10 w-16 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>

      {/* Desktop: Table View */}
      <div className="hidden lg:block">
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
      </div>

      {/* Mobile: Card View */}
      <div className="lg:hidden">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((value, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}