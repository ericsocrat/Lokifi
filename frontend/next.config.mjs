/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  experimental: {
    forceSwcTransforms: false,
  },
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { dev, isServer }) => {
    // Configure hot reloading
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
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
};

export default nextConfig;
