import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Basic experimental config - Turbopack handles most patterns automatically
  },
  // Only include webpack config when NOT using Turbopack
  ...(process.env.NEXT_TURBO !== '1' && {
    webpack: (config, { dev }) => {
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable ESLint during build to avoid configuration issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;