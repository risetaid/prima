"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { atomicGet, atomicSet, atomicRemove } from "@/lib/atomic-storage";
import { logger } from "@/lib/logger";

// Define the UserResource type locally since @clerk/types may not be directly installed
type UserResource = ReturnType<typeof useUser>['user'];

interface UserStatusData {
  role?: "DEVELOPER" | "ADMIN" | "RELAWAN";
  canAccessDashboard?: boolean;
  needsApproval?: boolean;
  isApproved?: boolean;
  isActive?: boolean;
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

// Cache configuration - Phase 2 optimizations
const CACHE_KEY = "prima_user_auth_status";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (was 5)
const RETRY_DELAY = 1000; // 1 second (was 2)
const MAX_RETRIES = 1; // 1 retry (was 2)
const BACKGROUND_FETCH_COOLDOWN = 5 * 60 * 1000; // 5 minutes (was 1)

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
  const lastBackgroundFetchRef = useRef(0);
  const isFetchingRef = useRef(false); // Prevent duplicate fetches

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
      // Add timeout to prevent hanging requests - increased to 15s for slow connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.warn('⏱️ /api/user/status request timeout', { attempt });
        controller.abort();
      }, 15000); // 15 second timeout

      // Add cache bust parameter on first attempt to force fresh data
      const bustCache = attempt === 1 ? '?bustCache=true' : '';
      logger.info(`🔄 Fetching user status (attempt ${attempt})${bustCache ? ' [cache bust]' : ''}`);
      
      const response = await fetch(`/api/user/status${bustCache}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // DEBUG: Log API response
      logger.info('📡 API /api/user/status response:', responseData);

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      // Extract the actual user data from the wrapped response
      // API returns { success: true, data: {...}, message: "...", ... }
      return responseData.data || responseData;
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
      logger.info('⏳ Waiting for Clerk auth to load', { userLoaded, authLoaded });
      return;
    }

    // If no user, mark as loaded with default values and RETURN EARLY
    // This prevents fetching /api/user/status when user is not signed in
    if (!user || !isSignedIn) {
      logger.info('👤 No user signed in - setting default state');
      setRole(null);
      setCanAccessDashboard(false);
      setNeedsApproval(true);
      setDbUserLoaded(true);
      isFetchingRef.current = false; // Reset fetch flag
      clearCachedUserData().catch((error) => {
        logger.warn("Failed to clear cached user data", { error: error instanceof Error ? error.message : String(error) });
      });
      return;
    }

    // Prevent duplicate fetches from useEffect running multiple times
    if (isFetchingRef.current) {
      logger.info('⏭️ Skipping duplicate auth fetch - already in progress');
      return;
    }

    logger.info('🔐 User signed in - checking auth state', { 
      userId: user.id,
      email: user.primaryEmailAddress?.emailAddress 
    });

    // Try to use cached data first for faster loading
    const cachedData = getCachedUserData();
    if (cachedData) {
      // Force refresh if cached data shows no dashboard access (might be stale)
      const needsForceRefresh = !cachedData.canAccessDashboard;

      logger.info("Using cached auth data for faster loading", {
        canAccessDashboard: cachedData.canAccessDashboard,
        needsForceRefresh
      });

      // If cached data denies access, DON'T mark as loaded yet - wait for fresh data
      if (needsForceRefresh) {
        logger.info("🔄 Cached data denies dashboard access - fetching fresh data before marking as loaded");
        isFetchingRef.current = true; // Mark as fetching
        isBackgroundFetchRunningRef.current = false; // Reset flag
        lastBackgroundFetchRef.current = 0; // Reset cooldown
        fetchUserStatus()
          .then((data) => {
            logger.info("✅ Force refreshed auth data", {
              oldCanAccess: cachedData.canAccessDashboard,
              newCanAccess: data.canAccessDashboard,
              role: data.role,
              needsApproval: data.needsApproval
            });
            setRole(data.role || "RELAWAN");
            setCanAccessDashboard(data.canAccessDashboard || false);
            setNeedsApproval(data.needsApproval !== false);
            setDbUserLoaded(true); // NOW mark as loaded with fresh data
            logger.info("🎯 Auth state updated - dbUserLoaded set to true", {
              canAccessDashboard: data.canAccessDashboard,
              role: data.role
            });
            setCachedUserData(data).catch((error) => {
              logger.warn("Failed to cache user data", { error: error instanceof Error ? error.message : String(error) });
            });
          })
          .catch((error) => {
            logger.warn(
              "⚠️ Force refresh failed, using cached data",
              { error: error instanceof Error ? error.message : String(error) }
            );
            // Even on error, mark as loaded so user isn't stuck
            setRole(cachedData.role || "RELAWAN");
            setCanAccessDashboard(cachedData.canAccessDashboard || false);
            setNeedsApproval(cachedData.needsApproval !== false);
            setDbUserLoaded(true);
          })
          .finally(() => {
            isFetchingRef.current = false; // Reset fetch flag
          });
        return; // Skip the background fetch since we're doing immediate refresh
      }

      // Cached data grants access - safe to use immediately
      logger.info("✅ Using cached data with dashboard access", {
        canAccessDashboard: cachedData.canAccessDashboard,
        role: cachedData.role
      });
      setRole(cachedData.role || "RELAWAN");
      setCanAccessDashboard(cachedData.canAccessDashboard || false);
      setNeedsApproval(cachedData.needsApproval !== false);
      setDbUserLoaded(true);

      // Still fetch fresh data in the background to ensure accuracy
      // Only run background fetch if not already running and cooldown has passed
      const now = Date.now();
      if (!isBackgroundFetchRunningRef.current && now - lastBackgroundFetchRef.current > BACKGROUND_FETCH_COOLDOWN) {
        isBackgroundFetchRunningRef.current = true;
        lastBackgroundFetchRef.current = now;
        fetchUserStatus()
          .then((data) => {
            // Always update if canAccessDashboard differs, regardless of full object comparison
            const dashboardAccessChanged = cachedData?.canAccessDashboard !== data.canAccessDashboard;
            const dataChanged = JSON.stringify(cachedData) !== JSON.stringify(data);

            if (dashboardAccessChanged || dataChanged) {
              logger.info("Updating auth state with fresh data", {
                dashboardAccessChanged,
                dataChanged,
                oldCanAccess: cachedData?.canAccessDashboard,
                newCanAccess: data.canAccessDashboard
              });
              setRole(data.role || "RELAWAN");
              setCanAccessDashboard(data.canAccessDashboard || false);
              setNeedsApproval(data.needsApproval !== false);
              setCachedUserData(data).catch((error) => {
                logger.warn("Failed to cache user data", { error: error instanceof Error ? error.message : String(error) });
              });
            } else {
              logger.info("No auth state update needed - data unchanged", {
                cachedAccess: cachedData?.canAccessDashboard,
                newAccess: data.canAccessDashboard
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
    logger.info('📡 No cached data - fetching fresh user status');
    isFetchingRef.current = true; // Mark as fetching
    // Only run main fetch if background fetch is not running
    if (!isBackgroundFetchRunningRef.current) {
      fetchUserStatus()
        .then((data) => {
          logger.info('✅ Setting auth state from fresh API data:', {
            role: data.role,
            canAccessDashboard: data.canAccessDashboard,
            needsApproval: data.needsApproval,
            isApproved: data.isApproved,
            isActive: data.isActive
          });
          setRole(data.role || "RELAWAN");
          setCanAccessDashboard(data.canAccessDashboard || false);
          setNeedsApproval(data.needsApproval !== false);
          setDbUserLoaded(true); // Mark as loaded after setting state
          logger.info('🎯 Auth state updated from fresh data - dbUserLoaded set to true', {
            canAccessDashboard: data.canAccessDashboard,
            role: data.role
          });
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
          isFetchingRef.current = false; // Reset fetch flag
        });
    } else {
      // Background fetch is already running, don't start another one
      logger.warn('⚠️ Background fetch already running, skipping duplicate fetch');
      isFetchingRef.current = false;
    }
  }, [user, userLoaded, authLoaded, isSignedIn, getCachedUserData, setCachedUserData, clearCachedUserData, fetchUserStatus]);

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
