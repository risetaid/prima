import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

// Preload admin chunks for better performance
const preloadAdminChunks = () => {
  if (typeof window !== 'undefined') {
    // Preload admin components
    Promise.all([
      import('@/components/admin/user-management'),
      import('@/components/admin/template-management'),
      import('@/components/admin/comprehensive-analytics-dashboard'),
      import('@/components/admin/llm-analytics-dashboard'),
    ]).catch(() => {
      // Silently fail if preloading fails
    });
  }
};

// Preload admin pages
const preloadAdminPages = () => {
  if (typeof window !== 'undefined') {
    Promise.all([
      import('@/app/(shell)/admin/users/page'),
      import('@/app/(shell)/admin/templates/page'),
    ]).catch(() => {
      // Silently fail if preloading fails
    });
  }
};

export function useAdminPreloader(userRole?: string | null) {
  const router = useRouter();

  // Preload admin chunks when user is admin/developer
  useEffect(() => {
    if (userRole === 'ADMIN' || userRole === 'DEVELOPER') {
      // Small delay to not interfere with initial page load
      const timer = setTimeout(() => {
        preloadAdminChunks();
        preloadAdminPages();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [userRole]);

  // Preload on hover/focus for admin navigation items
  const preloadOnInteraction = useCallback((route: string) => {
    switch (route) {
      case '/admin/users':
        import('@/components/admin/user-management').catch(() => {});
        break;
      case '/admin/templates':
        import('@/components/admin/template-management').catch(() => {});
        break;
      case '/admin/analytics':
        import('@/components/admin/comprehensive-analytics-dashboard').catch(() => {});
        break;
      case '/admin/llm-analytics':
        import('@/components/admin/llm-analytics-dashboard').catch(() => {});
        break;
      default:
        break;
    }
  }, []);

  // Prefetch route data
  const prefetchAdminRoute = useCallback((route: string) => {
    router.prefetch(route);
  }, [router]);

  return {
    preloadOnInteraction,
    prefetchAdminRoute,
    preloadAdminChunks,
    preloadAdminPages,
  };
}

// Hook for admin navigation with preloading
export function useAdminNavigation(userRole?: string | null) {
  const { preloadOnInteraction, prefetchAdminRoute } = useAdminPreloader(userRole);
  const router = useRouter();

  const navigateToAdmin = useCallback((route: string) => {
    preloadOnInteraction(route);
    router.push(route);
  }, [router, preloadOnInteraction]);

  const handleAdminNavHover = useCallback((route: string) => {
    preloadOnInteraction(route);
    prefetchAdminRoute(route);
  }, [preloadOnInteraction, prefetchAdminRoute]);

  const handleAdminNavFocus = useCallback((route: string) => {
    preloadOnInteraction(route);
  }, [preloadOnInteraction]);

  return {
    navigateToAdmin,
    handleAdminNavHover,
    handleAdminNavFocus,
  };
}

// Utility for checking if admin chunks are loaded
export function checkAdminChunksLoaded(): Promise<boolean> {
  return Promise.all([
    import('@/components/admin/user-management'),
    import('@/components/admin/template-management'),
  ])
    .then(() => true)
    .catch(() => false);
}

// Progressive enhancement for admin features
export function useProgressiveAdminFeatures() {
  const [adminFeaturesReady, setAdminFeaturesReady] = useState(false);

  useEffect(() => {
    checkAdminChunksLoaded().then(setAdminFeaturesReady);
  }, []);

  return adminFeaturesReady;
}
