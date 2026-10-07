/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    // Earlier names for the Shopping and Finance modules.
    return [
      { source: '/dashboard/groceries', destination: '/dashboard/shopping', permanent: false },
      { source: '/dashboard/budget', destination: '/dashboard/finance', permanent: false },
    ];
  },
};

module.exports = nextConfig;
