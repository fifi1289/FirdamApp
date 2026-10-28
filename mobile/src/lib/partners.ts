import { useEffect, useState } from 'react';

import { PARTNER_COLUMNS, type PartnerShop } from '@/shared/partners';
import { supabase } from '@/lib/supabase';

/** Active partner shops, the same list as Shopping on firdam.com. Empty if anything goes wrong. */
export function usePartnerShops(): PartnerShop[] {
  const [shops, setShops] = useState<PartnerShop[]>([]);
  useEffect(() => {
    let alive = true;
    type Result = { data: PartnerShop[] | null; error: unknown };
    const get = async (cols: string) => (await supabase.from('partner_shops').select(cols).eq('active', true)) as unknown as Result;
    (async () => {
      let res = await get(PARTNER_COLUMNS);
      // Before the topics column exists, fall back to the older columns.
      if (res.error) res = await get(PARTNER_COLUMNS.replace(', topics', ''));
      if (alive) setShops((res.data ?? []).map((s) => ({ ...s, topics: s.topics ?? [] })));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return shops;
}

/** Counts the tap for the shop's monthly numbers (only totals are ever shared with the shop). */
export function recordPartnerClick(partnerId: string) {
  supabase
    .from('partner_clicks')
    .insert({ partner_id: partnerId, source: 'app' })
    .then(() => {});
}
