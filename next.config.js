/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    // Modules that were renamed or moved to the future roadmap.
    return [
      { source: '/dashboard/shopping', destination: '/dashboard/groceries', permanent: true },
      { source: '/dashboard/finance', destination: '/dashboard/budget', permanent: true },
      { source: '/dashboard/learning', destination: '/dashboard/quran', permanent: true },
      { source: '/dashboard/community', destination: '/dashboard/halal-places', permanent: false },
      { source: '/dashboard/travel', destination: '/dashboard', permanent: false },
      { source: '/dashboard/health', destination: '/dashboard', permanent: false },
    ];
  },
};

module.exports = nextConfig;
