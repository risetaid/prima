import {withSentryConfig} from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Minimal experimental features for Next.js 15
  },
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