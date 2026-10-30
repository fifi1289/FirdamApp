import { useCallback, useEffect, useState } from 'react';

import type { GroceryItem, PantryItem } from './db-types';
import {
  aiPlansUsedThisMonth,
  buildLibraryPlan,
  formatDateISO,
  getStartOfWeek,
  saveWeekPlan,
  getShoppingList,
  isPaidPlan,
  loadHousehold,
  loadPantry,
  loadPreferences,
  loadShoppingItems,
  loadWeekPlan,
  type Household,
  type MealPreferencesState,
  type WeekPlan,
} from './kitchen';
import { tr } from '@/lib/i18n';

/** Everything the kitchen screens share, loaded once and refreshed on demand. */
export interface KitchenState {
  loading: boolean;
  error: string | null;
  prefs: MealPreferencesState | null;
  household: Household | null;
  pantry: PantryItem[];
  week: WeekPlan | null;
  /** Next week's plan (made automatically at the end of the week). */
  nextWeek: WeekPlan | null;
  listId: string | null;
  items: GroceryItem[];
  paid: boolean;
  aiUsed: number;
}

const initial: KitchenState = {
  loading: true,
  error: null,
  prefs: null,
  household: null,
  pantry: [],
  week: null,
  nextWeek: null,
  listId: null,
  items: [],
  paid: false,
  aiUsed: 0,
};

let state: KitchenState = initial;
const listeners = new Set<(s: KitchenState) => void>();
let inflight: Promise<void> | null = null;

function set(patch: Partial<KitchenState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

/** Monday of next week, as YYYY-MM-DD. */
export function nextWeekStart(): string {
  const d = getStartOfWeek();
  d.setDate(d.getDate() + 7);
  return formatDateISO(d);
}

/**
 * At the end of the week (Saturday and Sunday) next week's plan is made
 * automatically from the recipe library with the family's plan filters, so
 * it's ready when the weekly reminder arrives. Only for families who already
 * plan their weeks, and never over a plan they made themselves.
 */
async function ensureNextWeekPlan() {
  const day = new Date().getDay();
  if (day !== 6 && day !== 0) return;
  if (state.nextWeek || !state.week || !state.prefs) return;
  const prefs = { ...state.prefs, planningDuration: 7 };
  const plan = await buildLibraryPlan(prefs, state.household?.portions ?? 2, state.pantry, nextWeekStart());
  const id = await saveWeekPlan(plan, prefs, null);
  set({ nextWeek: { id, plan } });
}

export async function refreshKitchen(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [prefs, household, pantry, week, nextWeekPlan, list, paid, aiUsed] = await Promise.all([
        loadPreferences(),
        loadHousehold(),
        loadPantry(),
        loadWeekPlan(),
        loadWeekPlan(nextWeekStart()),
        getShoppingList(),
        isPaidPlan(),
        aiPlansUsedThisMonth(),
      ]);
      const items = await loadShoppingItems(list.id);
      set({ loading: false, error: null, prefs, household, pantry, week, nextWeek: nextWeekPlan, listId: list.id, items, paid, aiUsed });
      ensureNextWeekPlan().catch(() => {});
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : tr('Could not load your kitchen.') });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function refreshShopping(): Promise<void> {
  if (!state.listId) return refreshKitchen();
  set({ items: await loadShoppingItems(state.listId) });
}

export function patchKitchen(patch: Partial<KitchenState>) {
  set(patch);
}

export function resetKitchen() {
  state = initial;
  listeners.forEach((l) => l(state));
}

export function useKitchen(): KitchenState & { refresh: () => Promise<void> } {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    if (state.loading && !inflight) refreshKitchen();
    return () => {
      listeners.delete(setS);
    };
  }, []);
  const refresh = useCallback(() => refreshKitchen(), []);
  return { ...s, refresh };
}
