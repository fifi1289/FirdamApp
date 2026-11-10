import { useEffect, useState } from 'react';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
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
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Please sign in again.');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/little-plates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => null)) as { guide?: LittleGuideSet; error?: string } | null;
  if (!res.ok || !json?.guide) throw new Error(json?.error === 'limit' ? 'limit' : (json?.error ?? 'The guide could not be written just now.'));
  guides.set(id, json.guide);
  return json.guide;
}
