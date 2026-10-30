'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Briefcase, ChevronRight, Hammer, Laptop, PartyPopper, Plane, type LucideIcon } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NoPartnersHere, PartnerCard, usePartnerShops, useVisiblePartners } from '@/features/groceries/partner-shops';
import { SERVICE_GROUPS, SERVICES_NOTE, matchesWorks, partnersIn, servicePartners, serviceTypeCounts } from '@/features/groceries/partners';
import { PartnerFilters, type WorksFilter } from '@/features/partners/partner-filters';
import { tr, trn } from '@/lib/i18n';

const ICONS: Record<string, LucideIcon> = { home: Hammer, professional: Briefcase, business: Laptop, events: PartyPopper, travel: Plane };

/** Services: trusted Muslim-owned local businesses families hire, by group and kind, the same as in the Firdam app. */
export function ServicesDashboard() {
  const allShops = usePartnerShops();
  const [works, setWorks] = useState<WorksFilter>(null);
  const shops = useVisiblePartners(allShops).filter((s) => matchesWorks(s, works));
  const hasAny = partnersIn(allShops, 'services').length > 0;
  const [group, setGroup] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const counts = serviceTypeCounts(shops);
  const current = SERVICE_GROUPS.find((g) => g.id === group) ?? null;
  const list = current ? servicePartners(shops, current.id, type) : [];
  const groupCount = (id: string) => servicePartners(shops, id).length;

  const openGroup = (id: string | null) => {
    setGroup(id);
    setType(null);
  };

  return (
    <AppShell>
      <PageHeader title={tr('Services')} description={tr('Trusted Muslim-owned businesses for your home, paperwork, business, events and travel.')} />
      {hasAny && <PartnerFilters shops={allShops} works={works} onWorks={setWorks} />}

      {!current ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SERVICE_GROUPS.map((g) => {
            const Icon = ICONS[g.id] ?? Briefcase;
            const n = groupCount(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => openGroup(g.id)}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{tr(g.label)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {n ? `${n} ${n === 1 ? 'business' : 'businesses'}` : tr('Joining soon')}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{g.types.join(' · ')}</span>
                </span>
                <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => openGroup(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> {tr('All services')}
          </button>
          <h2 className="text-xl font-semibold text-foreground">{tr(current.label)}</h2>

          <nav aria-label={tr('Kinds of {0} services', [current.label])} className="flex flex-wrap gap-2">
            {[null, ...current.types].map((t) => (
              <button
                key={t ?? 'all'}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  type === t ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/40'
                )}
              >
                {trn(t) ?? tr('All')}
                {t && counts[t] ? <span className="ml-1.5 opacity-70">{trn(counts[t])}</span> : null}
              </button>
            ))}
          </nav>

          {list.length > 0 ? (
            <>
              {list.map((s) => (
                <PartnerCard key={s.id} shop={s} />
              ))}
              <p className="text-xs text-muted-foreground">{tr(SERVICES_NOTE)}</p>
            </>
          ) : servicePartners(allShops, current.id, type).length > 0 ? (
            <NoPartnersHere what={tr('{0} partners{1}', [type ?? current.label.toLowerCase(), works ? (works === 'online' ? ' working online' : ' working in person') : ''])} />
          ) : (
            <Card>
              <CardContent className="space-y-1 p-6">
                <p className="font-semibold text-foreground">{tr('No {0} partners yet', [type ?? current.label.toLowerCase()])}</p>
                <p className="text-sm text-muted-foreground">
                  {tr('We’re inviting trusted Muslim-owned businesses, insha’Allah. Know a good one? Tell them about Firdam.')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        {tr('Run a Muslim-owned business?')}{' '}
        <Link href="/partners" className="font-semibold text-primary underline-offset-2 hover:underline">
          {tr('Become a Firdam partner')}
        </Link>
        {tr(', free for founding partners.')}
      </p>
    </AppShell>
  );
}
