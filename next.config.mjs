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
  experimental: {
    workerThreads: false,
    cpus: 1,
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
    };
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'recharts', 'apexcharts', 'react-apexcharts'],
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
          headers: createSecureHeaders(),
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
    ];
  },
};

export default nextConfig;
