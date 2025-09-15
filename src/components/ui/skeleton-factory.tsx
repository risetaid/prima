import { Skeleton } from "./skeleton"
import { Card, CardContent, CardHeader } from "./card"

// Helper Components
export function SkeletonCard({ children, className = "bg-white" }: { children: React.ReactNode; className?: string }) {
  return <Card className={className}>{children}</Card>
}

export function SkeletonCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <CardHeader className={className}>{children}</CardHeader>
}

export function SkeletonCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <CardContent className={className}>{children}</CardContent>
}

export function SkeletonAvatar({ size = "h-8 w-8" }: { size?: string }) {
  return <Skeleton className={`${size} rounded-full`} />
}

export function SkeletonButton({ width = "w-24", height = "h-10" }: { width?: string; height?: string }) {
  return <Skeleton className={`${height} ${width} rounded`} />
}

export function SkeletonText({ lines = 1, widths = ["w-32"] }: { lines?: number; widths?: string[] }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((value, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}

export function SkeletonFormField({ labelWidth = "w-24", inputWidth = "w-full" }: { labelWidth?: string; inputWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`h-10 ${inputWidth}`} />
    </div>
  )
}

export function SkeletonTable({
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
        {Array.from({ length: columns }).map((value, i) => (
          <Skeleton key={i} className={`h-4 ${headerWidths[i] || "w-20"}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((value, i) => (
        <div key={i} className="grid gap-4 py-3 border-b last:border-0">
          {customRowRenderer ? customRowRenderer() : (
            Array.from({ length: columns }).map((value, j) => (
              <Skeleton key={j} className={`h-4 ${rowWidths[j] || "w-24"}`} />
            ))
          )}
        </div>
      ))}
    </div>
  )
}