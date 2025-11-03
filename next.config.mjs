// Force fresh build - ESLint configured to ignore during builds
// filepath: next.config.mjs
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Don't run ESLint during production builds on the server (CI/VERCEL)
    ignoreDuringBuilds: true,
  },
  env: {
    FREEZE_MT5_INTEGRATION: process.env.FREEZE_MT5_INTEGRATION ?? "1",
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