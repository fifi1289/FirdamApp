'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Briefcase, Hammer, Laptop, PartyPopper, Plane } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PartnerCard, usePartnerShops } from '@/features/groceries/partner-shops';
import { SERVICES_NOTE, serviceGroupsInUse, servicePartners } from '@/features/groceries/partners';

const COMING = [
  { icon: Hammer, title: 'Home', text: 'Renovation, cleaning, moving, plumbing and electrical, property management.' },
  { icon: Briefcase, title: 'Professional', text: 'Accountants for zakat and taxes, lawyers and wills, real estate, Islamic finance.' },
  { icon: Laptop, title: 'Business & digital', text: 'Website creation, marketing and social media, graphic design, business and project management.' },
  { icon: PartyPopper, title: 'Events', text: 'Halal catering, henna, photography and event planning.' },
  { icon: Plane, title: 'Travel', text: 'Hajj and Umrah operators and travel agencies.' },
];

/** Services: trusted Muslim-owned local businesses families hire, the same as in the Firdam app. */
export function ServicesDashboard() {
  const shops = usePartnerShops();
  const [group, setGroup] = useState<string | null>(null);
  const groups = serviceGroupsInUse(shops);
  const all = servicePartners(shops);
  const list = servicePartners(shops, group);

  return (
    <AppShell>
      <PageHeader
        title="Services"
        description="Trusted Muslim-owned businesses for your home, paperwork, business, events and travel."
      />

      {all.length > 0 ? (
        <div className="space-y-4">
          {groups.length > 1 && (
            <nav aria-label="Kinds of service" className="flex flex-wrap gap-2">
              {[{ id: null, label: 'All' }, ...groups].map((g) => (
                <button
                  key={g.id ?? 'all'}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  aria-pressed={group === g.id}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    group === g.id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/40'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </nav>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service partners · Muslim-owned</p>
          {list.map((s) => (
            <PartnerCard key={s.id} shop={s} />
          ))}
          <p className="text-xs text-muted-foreground">{SERVICES_NOTE}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="font-semibold text-foreground">Trusted businesses are joining soon, insha’Allah</p>
              <p className="mt-1 text-sm text-muted-foreground">We’re partnering with Muslim-owned businesses near you.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COMING.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-border p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Run a Muslim-owned business?{' '}
        <Link href="/partners" className="font-semibold text-primary underline-offset-2 hover:underline">
          Become a Firdam partner
        </Link>
        , free for founding partners.
      </p>
    </AppShell>
  );
}
