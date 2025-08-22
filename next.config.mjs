// filepath: next.config.mjs
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
  }
};

export default nextConfig;