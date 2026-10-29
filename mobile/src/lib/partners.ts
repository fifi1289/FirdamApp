import { useEffect, useState } from 'react';

import { PARTNER_COLUMN_FALLBACKS, type PartnerShop } from '@/shared/partners';
import { supabase } from '@/lib/supabase';

/** Active partner shops, the same list as Shopping on firdam.com. Empty if anything goes wrong. */
export function usePartnerShops(): PartnerShop[] {
  const [shops, setShops] = useState<PartnerShop[]>([]);
  useEffect(() => {
    let alive = true;
    type Result = { data: PartnerShop[] | null; error: unknown };
    const get = async (cols: string) => (await supabase.from('partner_shops').select(cols).eq('active', true)) as unknown as Result;
    (async () => {
      // Older databases may not have every column yet: try the newest set first.
      let res: Result = { data: null, error: true };
      for (const cols of PARTNER_COLUMN_FALLBACKS) {
        res = await get(cols);
        if (!res.error) break;
      }
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
