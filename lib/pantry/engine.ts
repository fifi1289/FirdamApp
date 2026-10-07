/**
 * Compares what recipes need with what's in the pantry — with real amounts,
 * scaled to the family's portions — and works out what to take out of the
 * pantry after cooking.
 */
import {
  convertBase,
  formatAmount,
  friendly,
  isBasic,
  isPresenceOnly,
  matchScore,
  toBase,
  toUnit,
} from '@/lib/pantry/units';

export type Level = 'full' | 'half' | 'low' | 'out';

export interface PantryLike {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  tracking?: 'count' | 'level' | null;
  level?: Level | null;
  expiration_date?: string | null;
}

export interface Need {
  name: string;
  quantity: number | null;
  unit: string;
  optional?: boolean;
}

export type LineStatus =
  | 'basic' // salt, water, spices — assumed
  | 'optional'
  | 'enough'
  | 'have-some' // you have it; amount can't be compared (a bunch, a pack)
  | 'staple' // tracked by level (rice, flour…) and not out
  | 'staple-low'
  | 'short' // you have some, not enough
  | 'missing';

export interface Line {
  need: Need;
  /** Amount needed after scaling to portions (in the recipe's unit). */
  scaled: number | null;
  item: PantryLike | null;
  status: LineStatus;
  /** How much to take from the pantry item, in the item's unit (count-tracked items only). */
  use: number | null;
  /** What to buy, in a friendly unit. */
  shortfall: { name: string; quantity: number | null; unit: string } | null;
  neededText: string;
  haveText: string;
}

export interface RecipeCheck {
  lines: Line[];
  shortCount: number;
  missingCount: number;
  /** ready = cook now; almost = a few things short/missing; far = mostly missing. */
  verdict: 'ready' | 'almost' | 'far';
}

/** Tracks what's left of each pantry item while planning several meals. */
export class Ledger {
  private left = new Map<string, number>();
  constructor(pantry: PantryLike[]) {
    for (const p of pantry) this.left.set(p.id, Number(p.quantity) || 0);
  }
  get(item: PantryLike) {
    return this.left.get(item.id) ?? (Number(item.quantity) || 0);
  }
  take(item: PantryLike, amount: number) {
    this.left.set(item.id, Math.max(0, this.get(item) - amount));
  }
}

function available(item: PantryLike, ledger: Ledger): boolean {
  if (item.tracking === 'level') return item.level !== 'out';
  return ledger.get(item) > 0;
}

function bestItem(name: string, pantry: PantryLike[], ledger: Ledger): PantryLike | null {
  let best: PantryLike | null = null;
  let bestScore = 0;
  for (const p of pantry) {
    if (!available(p, ledger)) continue;
    const s = matchScore(p.name, name);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

function shortfallFor(need: Need, scaled: number | null, missingInNeedUnit: number | null) {
  if (missingInNeedUnit == null || scaled == null) return { name: need.name, quantity: null, unit: '' };
  const base = toBase(missingInNeedUnit, need.unit, need.name);
  if (!base) return { name: need.name, quantity: null, unit: '' };
  const f = friendly(base.amount, base.base, need.name);
  return { name: need.name, quantity: f.quantity, unit: f.unit };
}

/**
 * Checks a recipe's ingredients against the pantry.
 * `factor` scales the recipe (family portions ÷ recipe servings).
 * With `commit`, amounts used are taken from the ledger (for weekly plans).
 */
export function checkNeeds(
  needs: Need[],
  pantry: PantryLike[],
  opts: { factor?: number; ledger?: Ledger; commit?: boolean } = {}
): RecipeCheck {
  const factor = opts.factor ?? 1;
  const ledger = opts.ledger ?? new Ledger(pantry);
  const lines: Line[] = needs.map((need) => {
    const scaled = need.quantity != null && need.quantity > 0 ? need.quantity * factor : null;
    const countable = /^(pieces?|cloves?|slices?)$/i.test(need.unit.trim());
    const neededText = formatAmount(countable && scaled != null ? Math.ceil(scaled * 2 - 0.2) / 2 : scaled, need.unit);
    const base: Omit<Line, 'status'> = { need, scaled, item: null, use: null, shortfall: null, neededText, haveText: '' };

    if (need.optional) return { ...base, status: 'optional' };
    if (isBasic(need.name)) return { ...base, status: 'basic' };

    const item = bestItem(need.name, pantry, ledger);
    if (!item) return { ...base, status: 'missing', shortfall: shortfallFor(need, scaled, scaled), haveText: 'none' };

    if (item.tracking === 'level') {
      return {
        ...base,
        item,
        status: item.level === 'low' ? 'staple-low' : 'staple',
        haveText: item.level === 'low' ? 'running low' : item.level === 'half' ? 'half left' : 'plenty',
      };
    }

    const have = ledger.get(item);
    const haveText = formatAmount(have, item.unit);
    const needBase = toBase(scaled, need.unit, need.name);
    if (!needBase || isPresenceOnly(item.unit, have)) return { ...base, item, status: 'have-some', haveText };

    const needInItemUnit = toUnit(needBase.amount, needBase.base, item.unit, need.name) ?? toUnit(needBase.amount, needBase.base, item.unit, item.name);
    if (needInItemUnit == null) return { ...base, item, status: 'have-some', haveText };

    if (have >= needInItemUnit * 0.97) {
      if (opts.commit) ledger.take(item, needInItemUnit);
      return { ...base, item, status: 'enough', use: needInItemUnit, haveText };
    }
    // Not enough: use what there is, buy the rest.
    const itemBase = toBase(needInItemUnit - have, item.unit, item.name);
    const missingNeedUnit =
      itemBase && scaled != null
        ? (() => {
            const inNeedBase = convertBase(itemBase.amount, itemBase.base, needBase.base, need.name);
            const perUnit = toBase(1, need.unit, need.name);
            return inNeedBase != null && perUnit ? inNeedBase / perUnit.amount : null;
          })()
        : null;
    if (opts.commit) ledger.take(item, have);
    return {
      ...base,
      item,
      status: 'short',
      use: have,
      haveText,
      shortfall: shortfallFor(need, scaled, missingNeedUnit ?? scaled),
    };
  });

  const counted = lines.filter((l) => l.status !== 'basic' && l.status !== 'optional');
  const missingCount = counted.filter((l) => l.status === 'missing').length;
  const shortCount = counted.filter((l) => l.status === 'short').length;
  const gaps = missingCount + shortCount;
  const verdict: RecipeCheck['verdict'] =
    gaps === 0 ? 'ready' : gaps <= Math.max(2, Math.ceil(counted.length * 0.35)) ? 'almost' : 'far';
  return { lines, shortCount, missingCount, verdict };
}

export interface Deduction {
  item: PantryLike;
  /** Amount taken, in the item's unit. */
  use: number;
  newQuantity: number;
}

/** What cooking this recipe takes out of the pantry (count-tracked items only). */
export function deductionsFor(check: RecipeCheck): Deduction[] {
  const byItem = new Map<string, Deduction>();
  for (const l of check.lines) {
    if (!l.item || l.use == null || l.use <= 0 || l.item.tracking === 'level') continue;
    const prev = byItem.get(l.item.id);
    const use = (prev?.use ?? 0) + l.use;
    const q = Number(l.item.quantity) || 0;
    byItem.set(l.item.id, { item: l.item, use: Math.min(use, q), newQuantity: Math.max(0, +(q - use).toFixed(3)) });
  }
  return Array.from(byItem.values());
}

/** Merges shortfalls of the same food across several recipes. */
export function mergeShortfalls(lists: { name: string; quantity: number | null; unit: string }[][]) {
  const out = new Map<string, { name: string; quantity: number | null; unit: string }>();
  for (const list of lists) {
    for (const s of list) {
      const key = `${s.name.toLowerCase()}|${s.unit}`;
      const prev = out.get(key);
      if (prev && prev.quantity != null && s.quantity != null) prev.quantity = +(prev.quantity + s.quantity).toFixed(2);
      else if (!prev) out.set(key, { ...s });
    }
  }
  return Array.from(out.values());
}
