/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
