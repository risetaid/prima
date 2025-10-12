"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// No loading components needed - Railway is fast
const DashboardSkeleton = () => null;

const EditorSkeleton = () => null;

// Lazy loaded components with proper types

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


// Reminder Components
export const LazyPatientReminderDashboard = dynamic(
  () => import("../pengingat/patient-reminder-dashboard").then((mod) => ({
    default: mod.PatientReminderDashboard,
  })),
  {
    loading: () => <DashboardSkeleton />,
  }
) as ComponentType<{
  patientName: string;
  canAddReminders?: boolean;
}>;

// Content Components - Removed LazyContentSelector due to type incompatibility
