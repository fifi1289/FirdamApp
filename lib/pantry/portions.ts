'use client';

import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export { portionFor, householdFrom, formatPortions, type Household } from '@/supabase/functions/_shared/pantry-portions';
import { householdFrom, type Household } from '@/supabase/functions/_shared/pantry-portions';

let cache: Promise<Household> | null = null;

/** The family's portions, from Family profiles (shared with the household). */
export function useHousehold(): { household: Household | null; refresh: () => void } {
  const [household, setHousehold] = useState<Household | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    cache ??= (async () => {
      const { data } = await createSupabaseBrowserClient().from('family_members').select('birth_date, relationship');
      return householdFrom((data ?? []) as { birth_date: string | null; relationship: string }[]);
    })();
    let live = true;
    cache.then((h) => live && setHousehold(h));
    return () => {
      live = false;
    };
  }, [tick]);
  return {
    household,
    refresh: () => {
      cache = null;
      setTick((t) => t + 1);
    },
  };
}
