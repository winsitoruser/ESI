import { createSecureHeaders } from "next-secure-headers";

// API server configuration - disable proxy for local development
const API_SERVER = process.env.BACKEND_URL || 'https://api.farmanesia.id';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const hostnames = [
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "githubusercontent.com",
  "googleusercontent.com",
  "images.unsplash.com",
  "cdn.discordapp.com",
  "res.cloudinary.com",
  "www.gravatar.com",
  "api.dicebear.com",
  "img.youtube.com",
  "discordapp.com",
  "pbs.twimg.com",
  "i.imgur.com",
  "utfs.io",
  "asset.kompas.com",
  "images.pexels.com",
  "images.unsplash.com"
];

const isExport = process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  // Enable standalone output for Docker deployment (only in production)
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  // Keep Node-only packages out of the client/webpack graph
  serverExternalPackages: ['ioredis', 'samlify', '@xmldom/xmldom', 'qrcode', '@sentry/node', 'cls-hooked', 'pg'],
  experimental: {
    workerThreads: false,
    cpus: 1,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'recharts', 'apexcharts', 'react-apexcharts'],
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // SWC minification enabled by default in Next.js 15

  // Webpack config to fix EMFILE (too many open files) on large projects
  webpack: (config, { dev, isServer }) => {
    // splitChunks left default in production — disabling caused missing page .js during collect
    if (dev && isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    if (dev) {
      config.cache = false;
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/public/uploads/**',
          '**/export/**',
          '**/scripts/**',
          '**/seeders/**',
          '**/migrations/**',
        ],
      };
    }
    // Fix sequelize SQLite dialect trying to load 'fs' in client bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      async_hooks: false,
      'cls-hooked': false,
    };
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('ioredis', 'samlify', 'cls-hooked', 'pg');
      }
    }
    return config;
  },
  
  // Transpile Radix UI and other ESM packages
  transpilePackages: [
    '@radix-ui/react-tabs',
    '@radix-ui/react-id',
    '@radix-ui/react-roving-focus',
    '@radix-ui/react-primitive',
    '@radix-ui/primitive',
    '@radix-ui/react-context',
    '@radix-ui/react-collection',
    '@radix-ui/react-direction',
    '@radix-ui/react-use-controllable-state',
    '@radix-ui/react-use-callback-ref',
    '@radix-ui/react-compose-refs',
    '@radix-ui/react-presence',
    '@radix-ui/react-slot'
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: hostnames.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
    unoptimized: true, // Disable Image Optimization for export
  },
  
  /**
  * Set custom website headers with next-secure-headers.
  * @see https://github.com/jagaapple/next-secure-headers
  */
  async headers() {
    if (!isExport) {
      return [
        {
          /**
           * Set security headers to all routes.
           */
          source: "/(.*)",
          headers: [
            ...createSecureHeaders(),
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            {
              key: 'Report-To',
              value: JSON.stringify({
                group: 'csp',
                max_age: 10886400,
                endpoints: [{ url: 'https://humanify.id/api/humanify/csp-report' }],
              }),
            },
            // SEC-APP-011 — report-only first; tighten after monitoring /api/humanify/csp-report
            {
              key: 'Content-Security-Policy-Report-Only',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
                "style-src 'self' 'unsafe-inline' https:",
                "img-src 'self' data: blob: https:",
                "font-src 'self' data: https:",
                "connect-src 'self' https: wss:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                'report-uri /api/humanify/csp-report',
              ].join('; '),
            },
          ],
        },
      ];
    }
    return [];
  },
  /**
   * Dangerously allow builds to successfully complete
   * even if your project has the types/eslint errors.
   *
   * Next.js has built-in support for TypeScript, using its own plugin.
   * But while you use `pnpm build`, it stops on the first type errors.
   * So you can use `pnpm bv` to check all type warns and errors at once.
   */
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      { source: '/hq/hris', destination: '/humanify', permanent: false },
      { source: '/hq/hris/:path*', destination: '/humanify/:path*', permanent: false },
      { source: '/api/hq/hris/:path*', destination: '/api/humanify/:path*', permanent: false },
      // Alias short URL used in empty-state CTAs → real devices page
      { source: '/humanify/devices', destination: '/humanify/attendance/devices', permanent: false },
    ];
  },

  // Runtime uploads live in public/uploads but next start 404s files added after build.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/uploads/letter-logos/:file', destination: '/api/humanify/public-upload/letter-logos/:file' },
        { source: '/uploads/marketing/:file', destination: '/api/humanify/public-upload/marketing/:file' },
      ],
    };
  },
};

export default nextConfig;
