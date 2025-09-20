import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Exclude archived files from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },

  // Permanent redirects for old /dashboard paths
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/pasien",
        permanent: true,
      },
      {
        source: "/dashboard/pengingat/:path*",
        destination: "/pengingat/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/berita/:path*",
        destination: "/berita/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/video/:path*",
        destination: "/video-edukasi/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/cms/:path*",
        destination: "/cms/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/pasien/:path*",
        destination: "/pasien/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/admin/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/pasien/:path*",
        permanent: true,
      },
    ];
  },

  // Standalone output for faster deployments
  output: "standalone",

  // Turbopack configuration for faster builds
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // External packages for server components (medical libs)
  serverExternalPackages: ["ioredis", "postgres", "sharp"],

  experimental: {
    // Optimize package imports for better tree shaking
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "date-fns",
      "zod",
      "drizzle-orm",
      "react-hook-form",
      "@hookform/resolvers",
      "sonner",
    ],
  },

  // Only include webpack config when NOT using Turbopack
  ...(process.env.NEXT_TURBO !== "1" && {
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
            chunks: "all",
            cacheGroups: {
              // Medical system specific chunks
              medical: {
                test: /[\\/]node_modules[\\/](date-fns|zod|drizzle-orm)[\\/]/,
                name: "medical-core",
                priority: 10,
                reuseExistingChunk: true,
              },
              // UI components chunk
              ui: {
                test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
                name: "ui-components",
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
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname:
          process.env.MINIO_PUBLIC_ENDPOINT?.replace("https://", "").replace(
            ":443",
            ""
          ) || "bucket-production-eb73.up.railway.app",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Disable ESLint during build to avoid configuration issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig as any);
