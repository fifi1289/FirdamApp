'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Loader2, MapPin, Plus, Search, Sparkles, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { distanceKm, formatDistance, useSavedLocation } from '@/lib/geo/location';
import { cn } from '@/lib/utils';
import type { Business, BusinessCategory } from '@/types/database';
import { BUSINESS_CATEGORIES } from '@/features/directory/directory-config';
import { BusinessSheet } from '@/features/directory/business-sheet';
import { BusinessFormDialog } from '@/features/directory/business-form-dialog';

export const BUSINESSES_CHANGED = 'firdam-businesses-changed';

export function BusinessRow({
  business,
  distance,
  onClick,
}: {
  business: Business;
  distance?: number;
  onClick: () => void;
}) {
  const meta = BUSINESS_CATEGORIES[business.category];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-sm',
        business.featured ? 'border-brand-gold/50 bg-brand-gold/5' : 'border-border/70 hover:border-primary/30'
      )}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate font-semibold text-foreground">{business.name}</span>
          {distance !== undefined && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDistance(distance)}</span>
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {meta.label}
          {business.city && <span>· {business.city}</span>}
          {business.serves_online && <span>· Online</span>}
          {business.is_partner && (
            <span className="inline-flex items-center gap-0.5 font-medium text-[#7a5a30] dark:text-brand-gold">
              <BadgeCheck className="h-3.5 w-3.5" /> Firdam Partner
            </span>
          )}
        </span>
        {business.description && (
          <span className="mt-1.5 line-clamp-2 block text-sm text-muted-foreground">{business.description}</span>
        )}
        {business.partner_offer && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-medium text-[#7a5a30] dark:text-brand-gold">
            <Sparkles className="h-3 w-3" /> {business.partner_offer}
          </span>
        )}
      </span>
    </button>
  );
}

/** Approved directory listings for the given categories, partners first. */
export function DirectoryList({
  categories,
  defaultCategory,
  emptyHint,
}: {
  categories: BusinessCategory[];
  defaultCategory?: BusinessCategory;
  emptyHint?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { location } = useSavedLocation();
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<BusinessCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Business | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const catKey = categories.join(',');

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(BUSINESSES_CHANGED, bump);
    return () => window.removeEventListener(BUSINESSES_CHANGED, bump);
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('businesses')
      .select('*')
      .eq('status', 'approved')
      .in('category', catKey.split(',') as BusinessCategory[])
      .limit(500)
      .then(({ data, error }) => {
        if (error) console.error('Failed to load directory:', error.message);
        setItems(data ?? []);
        setLoading(false);
      });
  }, [supabase, catKey, version]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((b) => category === 'all' || b.category === category)
      .filter(
        (b) =>
          !q ||
          `${b.name} ${b.description ?? ''} ${b.city ?? ''} ${b.services.join(' ')}`.toLowerCase().includes(q)
      )
      .map((b) => ({
        business: b,
        distance:
          location && b.latitude != null && b.longitude != null
            ? distanceKm(location, { latitude: b.latitude, longitude: b.longitude })
            : undefined,
      }))
      .sort(
        (a, b) =>
          Number(b.business.featured) - Number(a.business.featured) ||
          Number(b.business.is_partner) - Number(a.business.is_partner) ||
          (a.distance ?? 1e9) - (b.distance ?? 1e9) ||
          a.business.name.localeCompare(b.business.name)
      );
  }, [items, category, query, location]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium',
                  category === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium',
                    category === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'
                  )}
                >
                  {BUSINESS_CATEGORIES[c].plural}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, city, service"
              className="h-9 pl-9"
            />
          </div>
          <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setApplyOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> List your business
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trusted businesses…
        </p>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </span>
            <p className="mt-4 font-semibold text-foreground">No listings here yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {emptyHint ??
                'Firdam is onboarding trusted Muslim-friendly businesses. Own one? List it for free and reach families near you.'}
            </p>
            <Button size="sm" className="mt-5" onClick={() => setApplyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> List your business
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map(({ business, distance }) => (
            <BusinessRow key={business.id} business={business} distance={distance} onClick={() => setSelected(business)} />
          ))}
        </div>
      )}

      {location && visible.some((v) => v.distance !== undefined) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Distances from {location.label}
        </p>
      )}

      <BusinessSheet
        business={selected}
        distanceKm={visible.find((v) => v.business.id === selected?.id)?.distance}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <BusinessFormDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        defaultCategory={defaultCategory ?? categories[0]}
        onSaved={() => window.dispatchEvent(new Event(BUSINESSES_CHANGED))}
      />
    </div>
  );
}
