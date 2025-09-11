"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";

interface AuthContextState {
  user: UserResource | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER" | null;
  canAccessDashboard: boolean;
  needsApproval: boolean;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

// Cache configuration
const CACHE_KEY = "prima_user_auth_status";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [role, setRole] = useState<"SUPERADMIN" | "ADMIN" | "MEMBER" | null>(
    null
  );
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [dbUserLoaded, setDbUserLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isLoaded = userLoaded && authLoaded && dbUserLoaded;

  // Helper function to get cached data
  const getCachedUserData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.warn("Failed to read cached user data:", error);
    }
    return null;
  };

  // Helper function to cache user data
  const setCachedUserData = (data: any) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Failed to cache user data:", error);
    }
  };

  // Helper function to clear cache
  const clearCachedUserData = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear cached user data:", error);
    }
  };

  // Helper function to fetch user status with retry logic
  const fetchUserStatus = async (attempt = 1): Promise<any> => {
    try {
      const response = await fetch("/api/user/status", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error(`Auth fetch attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        console.log(
          `Retrying in ${RETRY_DELAY}ms... (attempt ${
            attempt + 1
          }/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchUserStatus(attempt + 1);
      }

      throw error;
    }
  };

  useEffect(() => {
    // Don't set any state until Clerk auth is fully loaded
    if (!userLoaded || !authLoaded) {
      return;
    }

    // If no user, mark as loaded with default values
    if (!user) {
      setRole(null);
      setCanAccessDashboard(false);
      setNeedsApproval(true);
      setDbUserLoaded(true);
      clearCachedUserData();
      return;
    }

    // Try to use cached data first for faster loading
    const cachedData = getCachedUserData();
    if (cachedData) {
      console.log("Using cached auth data for faster loading");
      setRole(cachedData.role || "MEMBER");
      setCanAccessDashboard(cachedData.canAccessDashboard || false);
      setNeedsApproval(cachedData.needsApproval !== false);
      setDbUserLoaded(true);

      // Still fetch fresh data in the background to ensure accuracy
      fetchUserStatus()
        .then((data) => {
          // Only update if data has changed
          if (JSON.stringify(cachedData) !== JSON.stringify(data)) {
            console.log("Updating auth state with fresh data");
            setRole(data.role || "MEMBER");
            setCanAccessDashboard(data.canAccessDashboard || false);
            setNeedsApproval(data.needsApproval !== false);
            setCachedUserData(data);
          }
        })
        .catch((error) => {
          console.warn(
            "Background auth refresh failed, using cached data:",
            error
          );
        });

      return;
    }

    // No cached data, fetch fresh data
    fetchUserStatus()
      .then((data) => {
        setRole(data.role || "MEMBER");
        setCanAccessDashboard(data.canAccessDashboard || false);
        setNeedsApproval(data.needsApproval !== false);
        setCachedUserData(data);
        setRetryCount(0);

        // Store successful login timestamp for optimistic UI
        if (data.canAccessDashboard) {
          localStorage.setItem(
            "prima_last_successful_login",
            Date.now().toString()
          );
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user status after all retries:", error);

        // Check if user had successful login recently for graceful degradation
        const lastLogin = localStorage.getItem("prima_last_successful_login");
        const recentLogin =
          lastLogin && Date.now() - parseInt(lastLogin) < 24 * 60 * 60 * 1000; // 24 hours

        if (recentLogin) {
          console.log("Using graceful degradation for recent user");
          setRole("MEMBER");
          setCanAccessDashboard(true);
          setNeedsApproval(false);
        } else {
          // Fallback to safe defaults for new users
          console.log("Using safe defaults for failed auth");
          setRole("MEMBER");
          setCanAccessDashboard(false);
          setNeedsApproval(true);
        }

        setRetryCount((prev) => prev + 1);
      })
      .finally(() => {
        setDbUserLoaded(true);
      });
  }, [user, userLoaded, authLoaded]);

  const value: AuthContextState = {
    user: user ?? null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    role,
    canAccessDashboard,
    needsApproval,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
