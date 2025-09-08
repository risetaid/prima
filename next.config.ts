import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for faster deployments
  output: 'standalone',
  
  // Turbopack is now stable
  turbopack: {
    // Basic Turbopack config for faster builds
  },
  
  // External packages for server components (medical libs)
  serverExternalPackages: ['ioredis', 'postgres', 'sharp'],
  
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select'],
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
      
      // Production optimizations
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Medical system specific chunks
              medical: {
                test: /[\\/]node_modules[\\/](date-fns|zod|drizzle-orm)[\\/]/,
                name: 'medical-core',
                priority: 10,
                reuseExistingChunk: true,
              },
              // UI components chunk
              ui: {
                test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
                name: 'ui-components',
                priority: 20,
                reuseExistingChunk: true,
              },
            },
          },
        };
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
          hostname: process.env.MINIO_PUBLIC_ENDPOINT?.replace('https://', '') || '*.minio.railway.app',
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