import {withSentryConfig} from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Basic experimental config - Turbopack doesn't need explicit configuration
    // for most use cases as it handles common patterns automatically
  },
  // Only include webpack config when NOT using Turbopack
  ...(process.env.NEXT_TURBO !== '1' && {
    webpack: (config, { dev, isServer }) => {
      if (dev) {
        // Suppress critical dependency warnings in development
        config.ignoreWarnings = [
          ...(config.ignoreWarnings || []),
          /Critical dependency: the request of a dependency is an expression/,
          /Module not found: Can't resolve 'fs'/,
          /Module not found: Can't resolve 'path'/,
        ];
      }
      return config;
    },
  }),
  // Performance optimizations  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  serverExternalPackages: [
    // Fix import-in-the-middle warnings
    'import-in-the-middle',
    'require-in-the-middle',
    // Suppress Prisma instrumentation warnings
    '@prisma/instrumentation',
    '@opentelemetry/instrumentation',
  ],
  // Disable ESLint during build to avoid configuration issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Only enable Sentry in production to avoid dev warnings
export default process.env.NODE_ENV === 'production' 
  ? withSentryConfig(nextConfig, {
      org: "universitas-ma-chung",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: true
    })
  : nextConfig;