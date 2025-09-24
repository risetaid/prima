"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton = memo<SkeletonProps>(({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className)}
      {...props}
    />
  );
});

Skeleton.displayName = "Skeleton";

// Pre-built skeleton components for common use cases
const SkeletonText = memo<{ lines?: number; className?: string }>(({ 
  lines = 1, 
  className 
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          "h-4",
          i === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
        )}
      />
    ))}
  </div>
));

SkeletonText.displayName = "SkeletonText";

const SkeletonAvatar = memo<{ size?: "sm" | "md" | "lg"; className?: string }>(({ 
  size = "md", 
  className 
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
  );
});

SkeletonAvatar.displayName = "SkeletonAvatar";

const SkeletonCard = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg border p-4 space-y-3", className)}>
    <div className="flex items-center space-x-3">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <SkeletonText lines={2} />
    <div className="flex space-x-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
));

SkeletonCard.displayName = "SkeletonCard";

// Patient-specific skeletons
const PatientCardSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg p-4 shadow-sm border", className)}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <SkeletonAvatar />
        <div className="space-y-2">
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
));

PatientCardSkeleton.displayName = "PatientCardSkeleton";

const PatientListSkeleton = memo<{ count?: number; className?: string }>(({ 
  count = 5, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <PatientCardSkeleton key={i} />
    ))}
  </div>
));

PatientListSkeleton.displayName = "PatientListSkeleton";

// Dashboard skeletons
const DashboardHeaderSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg p-6 shadow-sm border", className)}>
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
));

DashboardHeaderSkeleton.displayName = "DashboardHeaderSkeleton";

const DashboardStatsSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="ml-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
));

DashboardStatsSkeleton.displayName = "DashboardStatsSkeleton";

// CMS skeletons
const ArticleCardSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg border overflow-hidden", className)}>
    <Skeleton className="h-48 w-full" />
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-6 w-full" />
      <SkeletonText lines={3} />
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
      </div>
    </div>
  </div>
));

ArticleCardSkeleton.displayName = "ArticleCardSkeleton";

const VideoCardSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg border overflow-hidden", className)}>
    <div className="relative">
      <Skeleton className="h-48 w-full" />
      <div className="absolute bottom-2 right-2">
        <Skeleton className="h-6 w-12 rounded" />
      </div>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-6 w-full" />
      <SkeletonText lines={2} />
    </div>
  </div>
));

VideoCardSkeleton.displayName = "VideoCardSkeleton";

// Form skeletons
const FormFieldSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("space-y-2", className)}>
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-10 w-full rounded-md" />
  </div>
));

FormFieldSkeleton.displayName = "FormFieldSkeleton";

const FormSkeleton = memo<{ fields?: number; className?: string }>(({ 
  fields = 4, 
  className 
}) => (
  <div className={cn("space-y-6", className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <FormFieldSkeleton key={i} />
    ))}
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20 rounded-md" />
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  </div>
));

FormSkeleton.displayName = "FormSkeleton";

// Table skeletons
const TableRowSkeleton = memo<{ columns?: number; className?: string }>(({ 
  columns = 4, 
  className 
}) => (
  <div className={cn("grid gap-4 p-4 border-b", className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} className="h-4" />
    ))}
  </div>
));

TableRowSkeleton.displayName = "TableRowSkeleton";

const TableSkeleton = memo<{ 
  rows?: number; 
  columns?: number; 
  showHeader?: boolean; 
  className?: string;
}>(({ 
  rows = 5, 
  columns = 4, 
  showHeader = true, 
  className 
}) => (
  <div className={cn("bg-white rounded-lg border", className)}>
    {showHeader && (
      <div className="grid gap-4 p-4 border-b bg-gray-50" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
    )}
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} columns={columns} />
    ))}
  </div>
));

TableSkeleton.displayName = "TableSkeleton";

// Analytics skeletons
const ChartSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg border p-6", className)}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24 rounded" />
    </div>
    <Skeleton className="h-64 w-full rounded" />
  </div>
));

ChartSkeleton.displayName = "ChartSkeleton";

const AnalyticsDashboardSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    <DashboardStatsSkeleton />
    <div className="grid gap-6 md:grid-cols-2">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    <ChartSkeleton />
  </div>
));

AnalyticsDashboardSkeleton.displayName = "AnalyticsDashboardSkeleton";

// Mobile-specific skeletons
const MobilePatientCardSkeleton = memo<{ className?: string }>(({ className }) => (
  <div className={cn("bg-white rounded-lg p-3 shadow-sm border", className)}>
    <div className="flex items-center space-x-3">
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  </div>
));

MobilePatientCardSkeleton.displayName = "MobilePatientCardSkeleton";

const MobileListSkeleton = memo<{ count?: number; className?: string }>(({ 
  count = 3, 
  className 
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <MobilePatientCardSkeleton key={i} />
    ))}
  </div>
));

MobileListSkeleton.displayName = "MobileListSkeleton";

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  PatientCardSkeleton,
  PatientListSkeleton,
  DashboardHeaderSkeleton,
  DashboardStatsSkeleton,
  ArticleCardSkeleton,
  VideoCardSkeleton,
  FormFieldSkeleton,
  FormSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  ChartSkeleton,
  AnalyticsDashboardSkeleton,
  MobilePatientCardSkeleton,
  MobileListSkeleton,
};