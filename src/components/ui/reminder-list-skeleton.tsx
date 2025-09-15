import { Skeleton } from "./skeleton"
import { SkeletonCard, SkeletonCardContent, SkeletonAvatar, SkeletonButton } from "./skeleton-factory"

export function ReminderListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((value, i) => (
        <SkeletonCard key={i}>
          <SkeletonCardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <SkeletonAvatar size="h-10 w-10" />
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-64" />
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <SkeletonButton width="w-16" height="h-8" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </SkeletonCardContent>
        </SkeletonCard>
      ))}
    </div>
  )
}