'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ExternalLink, MapPin, Tag } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PARTNER_COLUMNS, PARTNER_NOTE, partnerLinkLabel, partnerMeta, partnersIn, type PartnerShop } from '@/features/groceries/partners';

/** Active partner shops for Shopping. Empty (never an error) if the table isn't there yet. */
export function usePartnerShops() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shops, setShops] = useState<PartnerShop[]>([]);
  useEffect(() => {
    type Result = { data: PartnerShop[] | null; error: unknown };
    const get = async (cols: string) => (await supabase.from('partner_shops').select(cols).eq('active', true)) as unknown as Result;
    const load = async () => {
      let res = await get(PARTNER_COLUMNS);
      // Before the topics column exists, fall back to the older columns.
      if (res.error) res = await get(PARTNER_COLUMNS.replace(', topics', ''));
      setShops((res.data ?? []).map((s) => ({ ...s, topics: s.topics ?? [] })));
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

export function PartnerShops({ shops, department }: { shops: PartnerShop[]; department: string }) {
  const list = partnersIn(shops, department);
  if (!list.length) return null;
  return (
    <section aria-label="Partner shops" className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner shops · Muslim-owned</p>
      {list.map((s) => (
        <PartnerCard key={s.id} shop={s} />
      ))}
      <p className="text-xs text-muted-foreground">{PARTNER_NOTE}</p>
    </section>
  );
}

export function PartnerCard({ shop }: { shop: PartnerShop }) {
  const meta = partnerMeta(shop);
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          {shop.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.image_url} alt={`${shop.name} logo`} className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold text-foreground">
              {shop.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{shop.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
                <BadgeCheck className="h-3 w-3" /> Partner
              </span>
            </div>
            {meta && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {meta}
              </p>
            )}
            {shop.description && <p className="mt-1.5 text-sm text-foreground">{shop.description}</p>}
            {shop.how_to_order && <p className="mt-1 text-sm text-muted-foreground">{shop.how_to_order}</p>}
            {shop.topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shop.topics.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {t}
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
              <img key={src} src={src} alt={`From ${shop.name}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
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
          {shop.discount_code && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 px-3 py-1.5 text-sm">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono font-semibold">{shop.discount_code}</span>
              {shop.discount_text && <span className="text-muted-foreground">· {shop.discount_text}</span>}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
