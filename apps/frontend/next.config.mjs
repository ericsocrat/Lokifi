import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false, // Temporarily disabled - causes chart duplication

  // Performance optimizations
  compress: true,
  poweredByHeader: false, // Security: Remove X-Powered-By header

  // Next.js 16: Turbopack config for monorepo - must use absolute path to monorepo root
  // This resolves "Next.js inferred your workspace root, but it may not be correct" error
  // Note: outputFileTracingRoot and turbopack.root must have the same value
  turbopack: {
    root: path.resolve(__dirname, '../..'), // Points to lokifi/ (monorepo root)
  },

  // Force ESM handling for lightweight-charts v5 (ESM-only package)
  transpilePackages: ['lightweight-charts'],

  experimental: {
    forceSwcTransforms: false,
  },

  // Fix for Docker builds - ensure output tracing works correctly
  // Must match turbopack.root for Next.js 16 compatibility
  outputFileTracingRoot: process.env.DOCKER_BUILD ? undefined : path.resolve(__dirname, '../..'),
  output: 'standalone',

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    // Configure hot reloading
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };

    // Fix lightweight-charts v5 ESM-only package resolution
    // The package only exports ESM, so we need to ensure webpack handles it correctly
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        ...config.resolve?.extensionAlias,
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.mjs': ['.mts', '.mjs'],
      },
      // Ensure import conditions prioritize ESM
      conditionNames: ['import', 'module', 'require', 'default'],
    };

    // Optimize for debugging
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
            },
          },
        },
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }

    return config;
  },
  // Enable detailed logging
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        port: '',
        pathname: '/coins/images/**',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
