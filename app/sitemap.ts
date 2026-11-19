import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

/** The public pages, for Google and other search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly') => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page('', 1, 'weekly'),
    page('/auth/register', 0.8, 'monthly'),
    page('/partners', 0.7, 'monthly'),
    page('/support', 0.6, 'monthly'),
    page('/security', 0.5, 'monthly'),
    page('/privacy', 0.4, 'yearly'),
    page('/terms', 0.4, 'yearly'),
    page('/auth/login', 0.3, 'yearly'),
  ];
}
