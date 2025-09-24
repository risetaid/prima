"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Loading components for better UX
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-64"></div>
      <div className="h-10 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white p-6 rounded-lg border">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-48"></div>
      <div className="h-10 bg-gray-200 rounded w-24"></div>
    </div>
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg border">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

const EditorSkeleton = () => (
  <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
    <div className="text-gray-500">Loading editor...</div>
  </div>
);

// Lazy loaded components with proper types
export const LazyComprehensiveAnalyticsDashboard = dynamic(
  () => import("./comprehensive-analytics-dashboard").then((mod) => ({
    default: mod.ComprehensiveAnalyticsDashboard,
  })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false, // Disable SSR for heavy analytics dashboard
  }
) as ComponentType<{ className?: string }>;

export const LazyLLMAnalyticsDashboard = dynamic(
  () => import("./llm-analytics-dashboard").then((mod) => ({
    default: mod.LLMAnalyticsDashboard,
  })),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false,
  }
) as ComponentType<{ className?: string }>;

export const LazyUserManagement = dynamic(
  () => import("./user-management"),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

export const LazyTemplateManagement = dynamic(
  () => import("./template-management"),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
) as ComponentType<Record<string, never>>;

// CMS Components
export const LazyQuillEditor = dynamic(
  () => import("../cms/QuillEditor").then((mod) => ({
    default: mod.QuillEditor,
  })),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Rich text editor should not be SSR'd
  }
) as ComponentType<{
  value: string;
  onEditorChange: (content: string) => void;
  placeholder?: string;
  height?: number;
}>;

// Patient Components
export const LazyPatientVariablesManager = dynamic(
  () => import("../patient/patient-variables-manager").then((mod) => ({
    default: mod.PatientVariablesManager,
  })),
  {
    loading: () => (
      <div className="bg-white p-6 rounded-lg border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ),
  }
) as ComponentType<{
  patientId: string;
  patientName: string;
}>;

// Reminder Components
export const LazyPatientReminderDashboard = dynamic(
  () => import("../pengingat/patient-reminder-dashboard").then((mod) => ({
    default: mod.PatientReminderDashboard,
  })),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
) as ComponentType<{
  patientName: string;
  canAddReminders?: boolean;
}>;

// Content Components - Removed LazyContentSelector due to type incompatibility
