/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // If you plan to use images from remote sources later
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // allow all hosts for now
      },
    ],
  },

  // Experimental features can be enabled here
  experimental: {
    appDir: true, // if you are using the /app directory
  },
};

export default nextConfig;
