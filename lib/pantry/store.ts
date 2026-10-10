'use client';

/**
 * All automatic pantry changes go through here, so each one is recorded in
 * `pantry_events` (with the row as it was) and can be undone as a batch.
 */
import { haramItemMessage } from '@/lib/recipes/halal';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { guessCategory } from '@/features/groceries/grocery-utils';
import { matchScore, toBase, toUnit } from '@/lib/pantry/units';
import type { Deduction } from '@/lib/pantry/engine';
import type { PantryCategory, PantryEventSource, PantryItem, PantryUnit } from '@/types/database';

type Row = Record<string, unknown>;

export type PantryChange =
  | { kind: 'update'; item: PantryItem; patch: Partial<Pick<PantryItem, 'quantity' | 'unit' | 'level' | 'tracking' | 'expiration_date'>> }
  | { kind: 'delete'; item: PantryItem }
  | {
      kind: 'insert';
      row: { name: string; category: PantryCategory; quantity: number; unit: PantryUnit; tracking?: 'count' | 'level'; level?: PantryItem['level']; expiration_date?: string | null };
    };

function snapshot(item: PantryItem): Row {
  const { id, name, category, quantity, unit, expiration_date, notes, tracking, level } = item;
  return { id, name, category, quantity, unit, expiration_date, notes, tracking, level };
}

/** Applies changes and records them under one batch id (returned for Undo). */
export async function applyPantryChanges(changes: PantryChange[], source: PantryEventSource, label: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const batchId = crypto.randomUUID();
  const events: {
    batch_id: string;
    source: PantryEventSource;
    label: string;
    pantry_item_id: string | null;
    item_name: string;
    before: Row | null;
    after: Row | null;
  }[] = [];

  // Halal only: refuse before changing anything (the database refuses too).
  for (const c of changes) {
    const name = c.kind === 'insert' ? c.row.name : c.kind === 'update' ? (c.patch as { name?: string }).name : undefined;
    const notHalal = typeof name === 'string' ? haramItemMessage(name) : null;
    if (notHalal) throw new Error(notHalal);
  }

  for (const c of changes) {
    if (c.kind === 'update') {
      const { data, error } = await supabase.from('pantry_items').update(c.patch).eq('id', c.item.id).select().single();
      if (error) throw error;
      events.push({ batch_id: batchId, source, label, pantry_item_id: c.item.id, item_name: c.item.name, before: snapshot(c.item), after: snapshot(data) });
    } else if (c.kind === 'delete') {
      const { error } = await supabase.from('pantry_items').delete().eq('id', c.item.id);
      if (error) throw error;
      events.push({ batch_id: batchId, source, label, pantry_item_id: c.item.id, item_name: c.item.name, before: snapshot(c.item), after: null });
    } else {
      const { data, error } = await supabase.from('pantry_items').insert(c.row).select().single();
      if (error) throw error;
      events.push({ batch_id: batchId, source, label, pantry_item_id: data.id, item_name: data.name, before: null, after: snapshot(data) });
    }
  }
  if (events.length) {
    const { error } = await supabase.from('pantry_events').insert(events);
    // History is a convenience; a failure here shouldn't undo the user's change.
    if (error) console.warn('Could not record pantry history:', error.message);
  }
  return batchId;
}

/** Puts every item in a batch back the way it was. */
export async function undoPantryBatch(batchId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: events, error } = await supabase
    .from('pantry_events')
    .select('*')
    .eq('batch_id', batchId)
    .eq('undone', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  for (const e of events ?? []) {
    if (!e.before && e.pantry_item_id) {
      await supabase.from('pantry_items').delete().eq('id', e.pantry_item_id);
    } else if (e.before) {
      const before = e.before as Row;
      const { id, ...rest } = before;
      const { data: existing } = await supabase.from('pantry_items').select('id').eq('id', id as string).maybeSingle();
      if (existing) await supabase.from('pantry_items').update(rest as never).eq('id', id as string);
      else await supabase.from('pantry_items').insert(before as never);
    }
  }
  await supabase.from('pantry_events').update({ undone: true }).eq('batch_id', batchId);
  await supabase.from('cooking_log').delete().eq('batch_id', batchId);
}

/** Changes for cooking: take amounts off; finished items are removed. */
export function changesForDeductions(deductions: { item: PantryItem; newQuantity: number }[]): PantryChange[] {
  return deductions.map((d) =>
    d.newQuantity <= 0.0001 ? { kind: 'delete' as const, item: d.item } : { kind: 'update' as const, item: d.item, patch: { quantity: d.newQuantity } }
  );
}

export const asPantryDeductions = (ds: Deduction[]) => ds as unknown as { item: PantryItem; newQuantity: number }[];

const PANTRY_UNITS: PantryUnit[] = ['Pieces', 'g', 'kg', 'ml', 'L', 'Pack', 'Bottle', 'Can', 'Box'];

/** Maps any unit word to the pantry's unit list. */
export function pantryUnit(unit: string | null | undefined): PantryUnit {
  const u = (unit ?? '').toLowerCase().trim();
  const map: Record<string, PantryUnit> = {
    g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilo: 'kg', ml: 'ml', l: 'L', litre: 'L', liter: 'L', pack: 'Pack',
    packs: 'Pack', bag: 'Pack', bags: 'Pack', bottle: 'Bottle', bottles: 'Bottle', can: 'Can', cans: 'Can', tin: 'Can',
    tins: 'Can', box: 'Box', boxes: 'Box', carton: 'Box', jar: 'Bottle',
  };
  return map[u] ?? (PANTRY_UNITS.find((p) => p.toLowerCase() === u) ?? 'Pieces');
}

/**
 * Changes that add groceries to the pantry, merging into an existing item of
 * the same food when the units can be converted (2 kg + 500 g → 2.5 kg).
 */
export function changesForAdding(
  items: { name: string; quantity: number | null; unit: string | null; category?: PantryCategory; tracking?: 'count' | 'level'; level?: PantryItem['level'] }[],
  pantry: PantryItem[]
): PantryChange[] {
  const changes: PantryChange[] = [];
  const working = pantry.map((p) => ({ ...p }));
  for (const it of items) {
    const unit = pantryUnit(it.unit);
    const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
    const match = working.find((p) => matchScore(p.name, it.name) >= 3);
    if (match) {
      if (match.tracking === 'level') {
        changes.push({ kind: 'update', item: match, patch: { level: 'full' } });
        continue;
      }
      const add = toBase(qty, unit, it.name);
      const inMatchUnit = add ? toUnit(add.amount, add.base, match.unit, it.name) : unit === match.unit ? qty : null;
      if (inMatchUnit != null) {
        const quantity = +(Number(match.quantity) + inMatchUnit).toFixed(3);
        const existing = changes.find((c) => c.kind === 'update' && c.item.id === match.id);
        if (existing && existing.kind === 'update') existing.patch.quantity = quantity;
        else changes.push({ kind: 'update', item: match, patch: { quantity } });
        match.quantity = quantity;
        continue;
      }
    }
    changes.push({
      kind: 'insert',
      row: {
        name: it.name.trim().replace(/^\w/, (c) => c.toUpperCase()),
        category: it.category ?? guessCategory(it.name),
        quantity: qty,
        unit,
        tracking: it.tracking ?? 'count',
        level: it.tracking === 'level' ? it.level ?? 'full' : null,
      },
    });
  }
  return changes;
}
