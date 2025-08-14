import { withSentryConfig } from "@sentry/nextjs";
const nextConfig = {
    /* config options here */
    experimental: {
        reactCompiler: false,
    },
    // Turbopack configuration (stable in Next 15.4+)
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
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
};
export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options
    org: "universitas-ma-chung",
    project: "javascript-nextjs",
    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,
    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true
});
