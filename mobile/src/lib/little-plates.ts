import { useEffect, useState } from 'react';

import { supabase } from './supabase';
import { littleOnesFromFamily, type LittleGuideSet, type LittleOne, type LittleStage } from '@/shared/little-plates-core';

let cache: { at: number; ones: LittleOne[] } | null = null;
const listeners = new Set<(ones: LittleOne[]) => void>();

/** Children under 4 in the family profile (refreshed at most every 5 minutes). */
export async function loadLittleOnes(force = false): Promise<LittleOne[]> {
  if (!force && cache && Date.now() - cache.at < 5 * 60_000) return cache.ones;
  const { data } = await supabase.from('family_members').select('first_name, relationship, birth_date');
  const ones = littleOnesFromFamily((data ?? []) as { first_name: string; relationship: string; birth_date: string | null }[]);
  cache = { at: Date.now(), ones };
  listeners.forEach((l) => l(ones));
  return ones;
}

export function useLittleOnes(): LittleOne[] {
  const [ones, setOnes] = useState<LittleOne[]>(cache?.ones ?? []);
  useEffect(() => {
    let alive = true;
    loadLittleOnes()
      .then((o) => alive && setOnes(o))
      .catch(() => {});
    listeners.add(setOnes);
    return () => {
      alive = false;
      listeners.delete(setOnes);
    };
  }, []);
  return ones;
}

const guides = new Map<string, LittleGuideSet>();

/** The saved "how to make it" guide, or a new one written (and saved) by the little-plates function. */
export async function loadLittleGuide(input: { key: string; name: string; ingredients: string[]; steps: string[]; stage: LittleStage }): Promise<LittleGuideSet> {
  const id = `${input.key}|${input.stage}`;
  const hit = guides.get(id);
  if (hit) return hit;
  const { data: saved } = await supabase.from('little_plates').select('guide').eq('recipe_key', input.key).eq('stage', input.stage).maybeSingle();
  if (saved?.guide) {
    guides.set(id, saved.guide as LittleGuideSet);
    return saved.guide as LittleGuideSet;
  }
  // Guides are written ahead of time for every library recipe; opening a plate
  // never starts an AI call.
  throw new Error('pending');
}
