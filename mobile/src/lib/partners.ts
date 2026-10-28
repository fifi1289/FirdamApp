import { useEffect, useState } from 'react';

import { PARTNER_COLUMNS, type PartnerShop } from '@/shared/partners';
import { supabase } from '@/lib/supabase';

/** Active partner shops, the same list as Shopping on firdam.com. Empty if anything goes wrong. */
export function usePartnerShops(): PartnerShop[] {
  const [shops, setShops] = useState<PartnerShop[]>([]);
  useEffect(() => {
    let alive = true;
    supabase
      .from('partner_shops')
      .select(PARTNER_COLUMNS)
      .eq('active', true)
      .then(({ data }) => {
        if (alive) setShops((data as PartnerShop[] | null) ?? []);
      });
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
