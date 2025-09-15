import React from 'react';

/**
 * Centralized UI utility functions for PRIMA system
 * Handles common UI patterns like avatars, labels, and formatting
 */

/**
 * Avatar generation utilities
 */
export interface AvatarData {
  initials: string;
  color: string;
}

export function generateAvatar(name: string): AvatarData {
  const initials = getInitials(name);
  const color = getAvatarColor(name);
  return { initials, color };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-lime-500",
    "bg-orange-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-sky-500",
  ];

  // Use name hash to ensure consistent color per person
  const hash = name.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Compliance label utilities
 */
export interface ComplianceLabel {
  text: string;
  bg: string;
  textColor: string;
}

export function getComplianceLabel(rate: number): ComplianceLabel {
  if (rate >= 80) {
    return {
      text: "Tinggi",
      bg: "bg-green-100",
      textColor: "text-green-800",
    };
  }
  if (rate >= 50) {
    return {
      text: "Sedang",
      bg: "bg-yellow-100",
      textColor: "text-yellow-800",
    };
  }
  return {
    text: "Rendah",
    bg: "bg-red-100",
    textColor: "text-red-800",
  };
}

/**
 * Status label utilities
 */
export interface StatusLabel {
  text: string;
  bg: string;
  textColor: string;
}

export function getStatusLabel(isActive: boolean): StatusLabel {
  return isActive
    ? { text: "Aktif", bg: "bg-blue-500", textColor: "text-white" }
    : { text: "Nonaktif", bg: "bg-gray-400", textColor: "text-white" };
}

/**
 * Phone number formatting utilities
 */
export function formatIndonesianPhone(phone?: string): string {
  if (!phone) return "-";

  // Format Indonesian phone number for display
  if (phone.startsWith("62")) {
    return "+62" + phone.substring(2);
  }

  return phone;
}

/**
 * Loading state utilities
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export function createLoadingState(
  isLoading: boolean,
  message = "Memuat data..."
): LoadingState {
  return { isLoading, message };
}

/**
 * Table utilities
 */
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (value: unknown, item: T) => React.ReactNode;
}

export function createTableColumns<T>(
  columns: Array<{
    key: keyof T | string;
    label: string;
    className?: string;
    render?: (value: unknown, item: T) => React.ReactNode;
  }>
): TableColumn<T>[] {
  return columns;
}

