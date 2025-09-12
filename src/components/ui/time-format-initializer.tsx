"use client";

import { useEffect } from "react";
import { initialize24HourFormat } from "@/lib/datetime";

/**
 * Client component that initializes 24-hour time format enforcement
 * This component should be included in the root layout to ensure
 * all time inputs across the app use 24-hour format
 */
export function TimeFormatInitializer() {
  useEffect(() => {
    // Initialize 24-hour format enforcement on mount
    initialize24HourFormat();

    // Also initialize on route changes (for Next.js app router)
    const handleRouteChange = () => {
      setTimeout(() => {
        initialize24HourFormat();
      }, 100);
    };

    // Listen for navigation events
    if (typeof window !== "undefined") {
      // For Next.js app router, we can listen to navigation events
      window.addEventListener("popstate", handleRouteChange);

      return () => {
        window.removeEventListener("popstate", handleRouteChange);
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}
