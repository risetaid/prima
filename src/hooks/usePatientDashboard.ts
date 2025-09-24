"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

export interface Patient {
  id: string;
  name: string;
  complianceRate: number;
  isActive: boolean;
  photoUrl?: string;
  phoneNumber?: string;
}

export function usePatientDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const fetchPatients = useCallback(async () => {
    try {
      // Primary: Optimized dashboard overview endpoint
      const response = await fetch("/api/dashboard/overview");
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
        setUserRole(data.user?.role || null);
      } else {
        // Fallback to original endpoint
        logger.warn(
          "Failed to fetch dashboard overview, falling back to patients endpoint"
        );
        const fallbackResponse = await fetch("/api/patients");
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setPatients(data);
          // Fallback doesn't have user role, keep existing or null
        } else {
          setPatients([]);
        }
      }
    } catch (error) {
      logger.error("Error fetching patients", error as Error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = useCallback(() => {
    let filtered = patients;
    if (searchQuery.trim()) {
      filtered = filtered.filter((patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeFilters.length > 0) {
      filtered = filtered.filter((patient) => {
        const isActive = patient.isActive;
        return (
          (activeFilters.includes("active") && isActive) ||
          (activeFilters.includes("inactive") && !isActive)
        );
      });
    }
    return filtered;
  }, [patients, searchQuery, activeFilters]);

  const toggleFilter = useCallback((filterType: string) => {
    setActiveFilters((prev) => {
      if (prev.includes(filterType)) {
        return prev.filter((f) => f !== filterType);
      } else {
        return [...prev, filterType];
      }
    });
  }, []);

  const handleAddPatientSuccess = useCallback(() => {
    setLoading(true);
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    filteredPatients: filteredPatients(),
    loading,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    handleAddPatientSuccess,
    refetch: fetchPatients,
    userRole,
  };
}
