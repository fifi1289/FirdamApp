'use client';

/**
 * Learns the family's habits from pantry history so the app can suggest the
 * shopping before anyone has to think about it:
 * - staples marked Low or Out,
 * - things bought regularly that are due again ("eggs every ~7 days"),
 * - staples that have usually run low by now ("rice usually lasts ~3 weeks").
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ingredientKey, matchScore } from '@/lib/pantry/units';
import type { PantryEvent, PantryItem } from '@/types/database';

export interface RestockSuggestion {
  name: string;
  /** Plain-language reason, e.g. "out", "usually every 7 days · last 9 days ago". */
  reason: string;
  kind: 'out' | 'low' | 'due' | 'check';
  quantity: number | null;
  unit: string | null;
  /** The staple to ask about (for kind "check"). */
  item?: PantryItem;
}

const DAY = 24 * 3600 * 1000;

function asNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** True when an event put food into the pantry (bought, topped up or refilled). */
function isRestock(e: PantryEvent): boolean {
  if (e.source === 'undo' || e.undone) return false;
  const before = e.before as Record<string, unknown> | null;
  const after = e.after as Record<string, unknown> | null;
  if (!after) return false;
  if (!before) return e.source !== 'setup';
  if (after.tracking === 'level') return after.level === 'full' && before.level !== 'full';
  const b = asNumber(before.quantity);
  const a = asNumber(after.quantity);
  return a != null && b != null && a > b && before.unit === after.unit;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export async function restockSuggestions(): Promise<RestockSuggestion[]> {
  const supabase = createSupabaseBrowserClient();
  const since = new Date(Date.now() - 180 * DAY).toISOString();
  const [{ data: pantryRows }, { data: eventRows }, { data: listRows }] = await Promise.all([
    supabase.from('pantry_items').select('*'),
    supabase.from('pantry_events').select('*').gte('created_at', since).order('created_at', { ascending: true }).limit(2000),
    supabase.from('grocery_items').select('name').eq('checked', false),
  ]);
  const pantry = (pantryRows ?? []) as PantryItem[];
  const events = ((eventRows ?? []) as PantryEvent[]).filter((e) => !e.undone && e.item_name !== 'Weekly check');
  const onList = (listRows ?? []).map((r) => r.name as string);
  const alreadyListed = (name: string) => onList.some((l) => matchScore(l, name) >= 2 || matchScore(name, l) >= 2);

  const out: RestockSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: RestockSuggestion) => {
    const key = ingredientKey(s.name);
    if (seen.has(key) || alreadyListed(s.name)) return;
    seen.add(key);
    out.push(s);
  };

  // 1. Staples marked Out or Low.
  for (const p of pantry) {
    if (p.tracking === 'level' && (p.level === 'out' || p.level === 'low')) {
      push({ name: p.name, reason: p.level === 'out' ? 'out' : 'running low', kind: p.level, quantity: null, unit: null });
    }
  }

  // Group history by food.
  const byFood = new Map<string, PantryEvent[]>();
  for (const e of events) {
    const key = ingredientKey(e.item_name);
    if (!key) continue;
    const list = byFood.get(key) ?? [];
    list.push(e);
    byFood.set(key, list);
  }

  const now = Date.now();
  for (const [, list] of Array.from(byFood.entries())) {
    const restocks = list.filter(isRestock);
    const name = list[list.length - 1]!.item_name;
    const current = pantry.find((p) => matchScore(p.name, name) >= 3);

    // 2. Bought regularly and due again.
    if (restocks.length >= 3) {
      const times = restocks.map((e) => new Date(e.created_at).getTime());
      // Purchases on the same day count once.
      const days = times.filter((t, i) => i === 0 || t - times[i - 1]! > DAY / 2);
      const gaps = days.slice(1).map((t, i) => (t - days[i]!) / DAY).filter((g) => g >= 1);
      if (gaps.length >= 2) {
        const every = Math.round(median(gaps));
        const since = Math.floor((now - days[days.length - 1]!) / DAY);
        const lastAfter = restocks[restocks.length - 1]!.after as Record<string, unknown> | null;
        const lastBefore = restocks[restocks.length - 1]!.before as Record<string, unknown> | null;
        const bought = lastAfter && lastBefore ? (asNumber(lastAfter.quantity) ?? 0) - (asNumber(lastBefore.quantity) ?? 0) : asNumber(lastAfter?.quantity);
        const stillPlenty =
          current && current.tracking !== 'level' && bought && Number(current.quantity) > bought * 0.5;
        if (every >= 2 && since >= every * 0.9 && !stillPlenty && !(current?.tracking === 'level')) {
          push({
            name,
            reason: `usually every ${every} days · last ${since} day${since === 1 ? '' : 's'} ago`,
            kind: 'due',
            quantity: bought && bought > 0 ? +bought.toFixed(2) : null,
            unit: (lastAfter?.unit as string) ?? null,
          });
        }
      }
    }

    // 3. Staples that have usually run low by now.
    if (current?.tracking === 'level' && (current.level === 'full' || current.level === 'half')) {
      const fulls = list.filter((e) => (e.after as Record<string, unknown> | null)?.level === 'full').map((e) => new Date(e.created_at).getTime());
      const lows = list
        .filter((e) => ['low', 'out'].includes(String((e.after as Record<string, unknown> | null)?.level)))
        .map((e) => new Date(e.created_at).getTime());
      const spans: number[] = [];
      for (const f of fulls) {
        const next = lows.find((l) => l > f);
        if (next) spans.push((next - f) / DAY);
      }
      if (spans.length >= 1 && fulls.length) {
        const lasts = Math.round(median(spans));
        const since = (now - fulls[fulls.length - 1]!) / DAY;
        if (lasts >= 3 && since >= lasts) {
          push({ name: current.name, reason: `usually runs low after ~${lasts} days`, kind: 'check', quantity: null, unit: null, item: current });
        }
      }
    }
  }

  const order = { out: 0, low: 1, due: 2, check: 3 } as const;
  return out.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 20);
}
