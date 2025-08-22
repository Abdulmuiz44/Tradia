/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prevent eslint warnings from blocking the Next.js production build
  eslint: {
    ignoreDuringBuilds: true
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow all hosts for now
      },
    ],
  },
};

export default nextConfig;
