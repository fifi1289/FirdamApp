import Link from 'next/link';

import { Logo } from '@/components/brand/logo';
import { SITE } from '@/lib/site';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Modules', href: '/#modules' },
      { label: 'Features', href: '/#features' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Support', href: '/support' },
      { label: 'Contact us', href: `mailto:${SITE.supportEmail}` },
      { label: 'Sign in', href: '/auth/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Security', href: '/security' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Logo height={52} />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              One home for your Muslim life — halal living, faith and family in one
              calm, trusted app. Made in Ottawa, Canada.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Firdam. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            One home for your Muslim life.
          </p>
        </div>
      </div>
    </footer>
  );
}
