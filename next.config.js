const isDev = process.env.NODE_ENV !== 'production';

// Supabase project (database, login, storage) — allowed for API calls.
let supabaseOrigin = 'https://*.supabase.co';
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
} catch {
  // keep the wildcard
}

/**
 * Content Security Policy: the browser only runs scripts and talks to servers
 * we list here, which blocks most injected-script attacks from reading
 * people's data. Update it if you add a new third-party script or API.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://cdnjs.cloudflare.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')} https://*.supabase.co wss://*.supabase.co`,
  'frame-src https://challenges.cloudflare.com',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Always use HTTPS (2 years), including subdomains.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Don't let other sites put Firdam in a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only the features the app uses: location (prayer times, places) and camera (receipts).
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    // Earlier names for the Shopping and Finance modules.
    return [
      { source: '/dashboard/groceries', destination: '/dashboard/shopping', permanent: false },
      { source: '/dashboard/budget', destination: '/dashboard/finance', permanent: false },
    ];
  },
};

module.exports = nextConfig;
