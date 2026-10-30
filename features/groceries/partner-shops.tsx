'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ExternalLink, Laptop, MapPin, Phone, Tag, Truck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  ALL_COUNTRIES,
  PARTNER_COLUMN_FALLBACKS,
  PARTNER_NOTE,
  countryName,
  notReachLabel,
  partnerLinkLabel,
  partnerMeta,
  partnerReaches,
  partnersFor,
  partnersIn,
  reachLabel,
  telLink,
  worksLabel,
  type PartnerShop,
} from '@/features/groceries/partners';
import { PartnerCountryPicker, usePartnerCountry } from '@/features/partners/partner-country';
import { tr, trn } from '@/lib/i18n';

/** Active partner shops for Shopping. Empty (never an error) if the table isn't there yet. */
export function usePartnerShops() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shops, setShops] = useState<PartnerShop[]>([]);
  useEffect(() => {
    type Result = { data: PartnerShop[] | null; error: unknown };
    const get = async (cols: string) => (await supabase.from('partner_shops').select(cols).eq('active', true)) as unknown as Result;
    const load = async () => {
      // Older databases may not have every column yet: try the newest set first.
      let res: Result = { data: null, error: true };
      for (const cols of PARTNER_COLUMN_FALLBACKS) {
        res = await get(cols);
        if (!res.error) break;
      }
      setShops((res.data ?? []).map((s) => ({ ...s, topics: s.topics ?? [], photos: s.photos ?? [] })));
    };
    load();
  }, [supabase]);
  return shops;
}

/** Counts the tap for the shop's monthly numbers; never blocks opening the link. */
function recordClick(partnerId: string) {
  createSupabaseBrowserClient()
    .from('partner_clicks')
    .insert({ partner_id: partnerId, source: 'web' })
    .then(() => {});
}

/** Partners that can reach the country the family is viewing (all of them for "All countries"). */
export function useVisiblePartners(shops: PartnerShop[]) {
  const { viewing } = usePartnerCountry();
  return partnersFor(shops, viewing);
}

/** Shown when no partner reaches the chosen country: never an empty page. */
export function NoPartnersHere({ what }: { what: string }) {
  const { viewing, setViewing } = usePartnerCountry();
  return (
    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      {tr('No {0} reach {1} yet.', [tr(what), tr(countryName(viewing))])}{' '}
      <button type="button" onClick={() => setViewing(ALL_COUNTRIES)} className="font-semibold text-primary hover:underline">
        {tr('See all countries')}
      </button>{' '}
      ·{' '}
      <a href="/partners" className="font-semibold text-primary hover:underline">
        {tr('Become a partner')}
      </a>
    </div>
  );
}

export function PartnerShops({ shops, department }: { shops: PartnerShop[]; department: string }) {
  const visible = useVisiblePartners(shops);
  const all = partnersIn(shops, department);
  const list = partnersIn(visible, department);
  if (!all.length) return null;
  return (
    <section aria-label={tr('Partner shops')} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Partner shops · Muslim-owned')}</p>
        <PartnerCountryPicker shops={shops} />
      </div>
      {list.length ? list.map((s) => <PartnerCard key={s.id} shop={s} />) : <NoPartnersHere what={tr('partner shops')} />}
      <p className="text-xs text-muted-foreground">{tr(PARTNER_NOTE)}</p>
    </section>
  );
}

export function PartnerCard({ shop }: { shop: PartnerShop }) {
  const meta = partnerMeta(shop);
  const { home, viewing } = usePartnerCountry();
  const reach = reachLabel(shop, tr);
  const works = tr(worksLabel(shop.works));
  const outside = viewing === ALL_COUNTRIES && home && !partnerReaches(shop, home) ? notReachLabel(shop, home, tr) : '';
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          {shop.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.image_url} alt={tr('{0} logo', [shop.name])} className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold text-foreground">
              {shop.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{trn(shop.name)}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
                <BadgeCheck className="h-3 w-3" /> {tr('Partner')}
              </span>
            </div>
            {meta && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {trn(meta)}
              </p>
            )}
            {(reach || works) && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {works && (
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5" /> {trn(works)}
                  </span>
                )}
                {reach && (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> {trn(reach)}
                  </span>
                )}
              </p>
            )}
            {outside && (
              <p className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">{trn(outside)}</p>
            )}
            {shop.description && <p className="mt-1.5 text-sm text-foreground">{tr(shop.description)}</p>}
            {shop.how_to_order && <p className="mt-1 text-sm text-muted-foreground">{trn(shop.how_to_order)}</p>}
            {shop.topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shop.topics.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {trn(t)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {shop.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {shop.photos.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={tr('From {0}', [shop.name])} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordClick(shop.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {partnerLinkLabel(shop.url)}
            <ExternalLink className="h-4 w-4" />
          </a>
          {shop.phone && (
            <a
              href={telLink(shop.phone)}
              onClick={() => recordClick(shop.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4" />
              {shop.phone}
            </a>
          )}
          {shop.discount_code && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 px-3 py-1.5 text-sm">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono font-semibold">{trn(shop.discount_code)}</span>
              {shop.discount_text && <span className="text-muted-foreground">· {trn(shop.discount_text)}</span>}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
