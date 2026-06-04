/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode disabled because Framer Motion + next-themes can ping-pong
  // under StrictMode's intentional double-invoke in dev.
  reactStrictMode: false,
  // Allow large base64 images from PPT files
  experimental: {
    largePageDataBytes: 256 * 1024 * 1024, // 256 MB
  },
  // Don't lint during build (we type-check separately)
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
