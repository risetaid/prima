"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";
import { atomicGet, atomicSet, atomicRemove } from "@/lib/atomic-storage";
import { logger } from "@/lib/logger";

interface UserStatusData {
  role?: "DEVELOPER" | "ADMIN" | "RELAWAN";
  canAccessDashboard?: boolean;
  needsApproval?: boolean;
}

interface AuthContextState {
  user: UserResource | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  role: "DEVELOPER" | "ADMIN" | "RELAWAN" | null;
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
  const [role, setRole] = useState<"DEVELOPER" | "ADMIN" | "RELAWAN" | null>(
    null
  );
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [dbUserLoaded, setDbUserLoaded] = useState(false);
  const isBackgroundFetchRunningRef = useRef(false);

  const isLoaded = userLoaded && authLoaded && dbUserLoaded;

  // Helper function to get cached data
  const getCachedUserData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      logger.warn("Failed to read cached user data", { error: error instanceof Error ? error.message : String(error) });
    }
    return null;
  }, []);

  // Helper function to cache user data
  const setCachedUserData = useCallback(async (data: UserStatusData) => {
    try {
      await atomicSet(CACHE_KEY, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.warn("Failed to cache user data", { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  // Helper function to clear cache
  const clearCachedUserData = useCallback(async () => {
    try {
      await atomicRemove(CACHE_KEY);
    } catch (error) {
      logger.warn("Failed to clear cached user data", { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  // Helper function to fetch user status with retry logic
  const fetchUserStatus = useCallback(async (attempt = 1): Promise<UserStatusData> => {
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
      logger.error(`Auth fetch attempt ${attempt} failed`, error instanceof Error ? error : new Error(String(error)), { attempt, maxRetries: MAX_RETRIES });

      if (attempt < MAX_RETRIES) {
        logger.info(
          `Retrying auth fetch in ${RETRY_DELAY}ms`,
          { attempt: attempt + 1, maxRetries: MAX_RETRIES }
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchUserStatus(attempt + 1);
      }

      throw error;
    }
  }, []);

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
      clearCachedUserData().catch((error) => {
        logger.warn("Failed to clear cached user data", { error: error instanceof Error ? error.message : String(error) });
      });
      return;
    }

    // Try to use cached data first for faster loading
    const cachedData = getCachedUserData();
    if (cachedData) {
      logger.info("Using cached auth data for faster loading");
      setRole(cachedData.role || "RELAWAN");
      setCanAccessDashboard(cachedData.canAccessDashboard || false);
      setNeedsApproval(cachedData.needsApproval !== false);
      setDbUserLoaded(true);

      // Still fetch fresh data in the background to ensure accuracy
      // Only run background fetch if not already running
      if (!isBackgroundFetchRunningRef.current) {
        isBackgroundFetchRunningRef.current = true;
        fetchUserStatus()
          .then((data) => {
            // Only update if data has changed and component is still mounted
            if (JSON.stringify(cachedData) !== JSON.stringify(data)) {
              logger.info("Updating auth state with fresh data");
              setRole(data.role || "RELAWAN");
              setCanAccessDashboard(data.canAccessDashboard || false);
              setNeedsApproval(data.needsApproval !== false);
              setCachedUserData(data).catch((error) => {
                logger.warn("Failed to cache user data", { error: error instanceof Error ? error.message : String(error) });
              });
            }
          })
          .catch((error) => {
            logger.warn(
              "Background auth refresh failed, using cached data",
              { error: error instanceof Error ? error.message : String(error) }
            );
          })
          .finally(() => {
            isBackgroundFetchRunningRef.current = false;
          });
      }

      return;
    }

    // No cached data, fetch fresh data
    // Only run main fetch if background fetch is not running
    if (!isBackgroundFetchRunningRef.current) {
      fetchUserStatus()
        .then((data) => {
          setRole(data.role || "RELAWAN");
          setCanAccessDashboard(data.canAccessDashboard || false);
          setNeedsApproval(data.needsApproval !== false);
          setCachedUserData(data).catch((error) => {
            logger.warn("Failed to update cached user data", { error: error instanceof Error ? error.message : String(error) });
          });

          // Store successful login timestamp for optimistic UI
          if (data.canAccessDashboard) {
            atomicSet(
              "prima_last_successful_login",
              Date.now().toString()
            ).catch((error) => {
              logger.warn("Failed to store login timestamp", { error: error instanceof Error ? error.message : String(error) });
            });
          }
        })
        .catch((error) => {
          logger.error(
            "Failed to fetch user status after all retries",
            error instanceof Error ? error : new Error(String(error))
          );

          // Check if user had successful login recently for graceful degradation
          const lastLoginPromise = atomicGet("prima_last_successful_login");
          lastLoginPromise
            .then((lastLogin) => {
              const recentLogin =
                typeof lastLogin === "string" &&
                Date.now() - parseInt(lastLogin) < 24 * 60 * 60 * 1000; // 24 hours

              if (recentLogin) {
                logger.info("Using graceful degradation for recent user");
                setRole("RELAWAN");
                setCanAccessDashboard(true);
                setNeedsApproval(false);
              } else {
                // Fallback to safe defaults for new users
                logger.info("Using safe defaults for failed auth");
                setRole("RELAWAN");
                setCanAccessDashboard(false);
                setNeedsApproval(true);
              }

              setDbUserLoaded(true);
            })
            .catch((error) => {
              logger.warn("Failed to read login timestamp", { error: error instanceof Error ? error.message : String(error) });
              // Fallback to safe defaults
              logger.info("Using safe defaults for failed auth");
              setRole("RELAWAN");
              setCanAccessDashboard(false);
              setNeedsApproval(true);
              setDbUserLoaded(true);
            });
        })
        .finally(() => {
          setDbUserLoaded(true);
        });
    } else {
      // Background fetch is running, just mark as loaded
      setDbUserLoaded(true);
    }
  }, [user, userLoaded, authLoaded, getCachedUserData, setCachedUserData, clearCachedUserData, fetchUserStatus]);

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
