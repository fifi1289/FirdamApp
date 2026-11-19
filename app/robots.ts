import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

/** Search engines may read the public pages; families' own pages stay out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/settings', '/profile', '/join', '/verify-2fa', '/auth/confirm', '/auth/callback', '/auth/reset-password'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
