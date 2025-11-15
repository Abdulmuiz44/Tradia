// filepath: next.config.mjs
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Don't run ESLint during production builds on the server (CI/VERCEL)
    ignoreDuringBuilds: true,
  },
  env: {
    FREEZE_MT5_INTEGRATION: process.env.FREEZE_MT5_INTEGRATION ?? "1",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'vercel.app',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Add this to handle any potential CORS issues
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/ai/chat',
        destination: 'http://localhost:8001/chat',
      },
    ];
  }
};

export default nextConfig;