/**
 * "I have it" on a recipe ingredient: the family already has it but it isn't
 * in the pantry yet. Works out the one pantry change to make; the website and
 * the phone app both run it (the app gets a copy via mobile/scripts/sync-shared.mjs),
 * so they behave the same.
 */
import { guessCategory, toPantryUnit } from '@/features/groceries/grocery-utils';
import { suggestedExpiry } from '@/supabase/functions/_shared/kitchen-items';
import type { Line } from '@/supabase/functions/_shared/pantry-engine';
import { convertBase, toBase } from '@/supabase/functions/_shared/pantry-units';

/** Cupboard basics: tracked as "have it / running low", not counted. */
const LEVEL_CATEGORIES = ['Spices', 'Oils & Condiments', 'Grains', 'Pasta & Rice', 'Canned Foods'];

export type HaveItChange =
  | { kind: 'update'; id: string; patch: { quantity?: number; level?: 'full'; updated_at: string } }
  | {
      kind: 'insert';
      row: {
        name: string;
        category: string;
        tracking: 'level' | 'count';
        level: 'full' | null;
        quantity: number;
        unit: string;
        expiration_date: string | null;
      };
    };

export function haveItChange(line: Line, now = new Date()): HaveItChange {
  const name = line.need.name.trim().replace(/^\w/, (c) => c.toUpperCase());
  const item = line.item;
  const stamp = now.toISOString();
  if (item?.id) {
    if (item.tracking === 'level') return { kind: 'update', id: item.id, patch: { level: 'full', updated_at: stamp } };
    // Top up by what the recipe needs, in the pantry item's own unit.
    const need = line.scaled != null ? toBase(line.scaled, line.need.unit || 'pieces', name) : null;
    const per = toBase(1, item.unit || 'pieces', name);
    const add = need && per ? convertBase(need.amount, need.base, per.base, name) : null;
    const quantity =
      add != null && per ? +(Number(item.quantity ?? 0) + add / per.amount).toFixed(2) : Number(item.quantity ?? 0) + 1;
    return { kind: 'update', id: item.id, patch: { quantity, updated_at: stamp } };
  }
  const category = guessCategory(name);
  const mapped = toPantryUnit(line.need.unit || null);
  const unit = line.need.unit && mapped.toLowerCase() === line.need.unit.toLowerCase() ? mapped : null;
  const level = LEVEL_CATEGORIES.includes(category) || !unit || line.scaled == null;
  return {
    kind: 'insert',
    row: {
      name,
      category,
      tracking: level ? 'level' : 'count',
      level: level ? 'full' : null,
      quantity: level ? 1 : (line.scaled as number),
      unit: level ? 'Pack' : (unit as string),
      expiration_date: suggestedExpiry(category, now),
    },
  };
}
