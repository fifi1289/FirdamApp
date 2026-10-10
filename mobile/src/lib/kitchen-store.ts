import { useCallback, useEffect, useState } from 'react';

import type { GroceryItem, PantryItem } from './db-types';
import {
  aiPlansUsedThisMonth,
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

/** Everything the kitchen screens share, loaded once and refreshed on demand. */
export interface KitchenState {
  loading: boolean;
  error: string | null;
  prefs: MealPreferencesState | null;
  household: Household | null;
  pantry: PantryItem[];
  week: WeekPlan | null;
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

export async function refreshKitchen(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [prefs, household, pantry, week, list, paid, aiUsed] = await Promise.all([
        loadPreferences(),
        loadHousehold(),
        loadPantry(),
        loadWeekPlan(),
        getShoppingList(),
        isPaidPlan(),
        aiPlansUsedThisMonth(),
      ]);
      const items = await loadShoppingItems(list.id);
      set({ loading: false, error: null, prefs, household, pantry, week, listId: list.id, items, paid, aiUsed });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not load your kitchen.' });
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
