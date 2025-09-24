"use client";

import { useState, useEffect } from "react";

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    // Set initial value
    setIsDesktop(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return {
    isDesktop,
    isMobile: !isDesktop,
  };
}
