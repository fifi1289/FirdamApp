/**
 * Kitchen data for the app: recipes, the week's meal plan, preferences,
 * household portions, the pantry and the shopping list. Reads and writes the
 * same tables as firdam.com, so the website and the app always agree.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { GroceryItem, MealPreferencesRow, PantryItem } from './db-types';
import { supabase } from './supabase';
import { conflictsWithAllergies, detectAllergens, fitsDiet } from '@/shared/allergens';
import { mealHaramReason } from '@/shared/halal';
import { guessCategory } from '@/shared/grocery-utils';
import { getMealImage } from '@/shared/meal-images';
import { DEFAULT_PREFERENCES, type MealPreferencesState } from '@/shared/meals-config';
import { checkNeeds, Ledger, mergeShortfalls, type Need } from '@/shared/pantry-engine';
import { householdFrom, type Household } from '@/shared/pantry-portions';
import { addAmounts, convertBase, ingredientKey, toBase } from '@/shared/pantry-units';
import {
  RECIPE_SELECT,
  buildPlanFromRecipes,
  fetchAllPages,
  fillMissingIngredients,
  mealsMissingIngredients,
  formatDateISO,
  formatWeekRange,
  getStartOfWeek,
  newPlanId,
  normalizePlan,
  type GeneratedMealPlan,
  type MealIngredient,
  type MockMeal,
  type RecipeRow,
} from '@/shared/plan-core';

export type { GeneratedMealPlan, MockMeal, RecipeRow, MealPreferencesState, Household };
export { formatWeekRange, getStartOfWeek, formatDateISO };

/** The plan limits on the phone, matching lib/plan/plan.ts. */
export const AI_PLANS_PER_MONTH = { free: 1, paid: 8 } as const;

// ---------- Preferences, household, plan ----------

export async function loadPreferences(): Promise<MealPreferencesState> {
  const { data } = await supabase.from('meal_preferences').select('*').maybeSingle();
  const row = data as MealPreferencesRow | null;
  if (!row) return { ...DEFAULT_PREFERENCES, mealTypes: [...DEFAULT_PREFERENCES.mealTypes], dietaryPreferences: [], allergies: [], cuisinePreferences: {} };
  return {
    planningDuration: row.planning_duration,
    mealTypes: row.meal_types,
    usePantryFirst: row.use_pantry_first,
    dietaryPreferences: row.dietary_preferences ?? [],
    allergies: row.allergies ?? [],
    cuisinePreferences: row.cuisine_preferences ?? {},
  };
}

export async function savePreferences(p: MealPreferencesState): Promise<void> {
  const { error } = await supabase.from('meal_preferences').upsert(
    {
      planning_duration: p.planningDuration,
      meal_types: p.mealTypes,
      use_pantry_first: p.usePantryFirst,
      dietary_preferences: p.dietaryPreferences,
      allergies: p.allergies,
      cuisine_preferences: p.cuisinePreferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

/** Allergy and diet names to choose from (the same lists as the website). */
export async function loadChoices(): Promise<{ allergies: string[]; diets: string[] }> {
  const [a, d] = await Promise.all([
    supabase.from('allergens').select('name').order('name'),
    supabase.from('dietary_preferences').select('name').order('name'),
  ]);
  return {
    allergies: ((a.data ?? []) as { name: string }[]).map((r) => r.name),
    diets: ((d.data ?? []) as { name: string }[]).map((r) => r.name),
  };
}

export async function loadHousehold(): Promise<Household> {
  const { data } = await supabase.from('family_members').select('birth_date, relationship');
  const members = (data ?? []) as { birth_date: string | null; relationship: string }[];
  return members.length ? householdFrom(members) : { portions: 2, people: 2, children: 0 };
}

export async function loadPantry(): Promise<PantryItem[]> {
  const { data } = await supabase.from('pantry_items').select('*').order('created_at', { ascending: false });
  return (data ?? []) as PantryItem[];
}

export async function isPaidPlan(): Promise<boolean> {
  const { data } = await supabase.from('subscriptions').select('plan, status, current_period_end').maybeSingle();
  const s = data as { plan: string; status: string; current_period_end: string | null } | null;
  if (!s || s.plan === 'free') return false;
  const live = ['active', 'trialing', 'past_due'].includes(s.status);
  return live && (!s.current_period_end || new Date(s.current_period_end) > new Date());
}

export async function aiPlansUsedThisMonth(): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'ai_meal_plan')
    .gte('created_at', start.toISOString());
  return count ?? 0;
}

export interface WeekPlan {
  id: string | null;
  plan: GeneratedMealPlan;
}

/** This week's plan (Monday to Sunday), shared with the household. */
export async function loadWeekPlan(weekStart = formatDateISO(getStartOfWeek())): Promise<WeekPlan | null> {
  const { data } = await supabase.from('meal_plans').select('id, plan_data, created_at').order('created_at', { ascending: false }).limit(50);
  const rows = (data ?? []) as { id: string; plan_data: Record<string, unknown> }[];
  const row = rows.find((r) => (r.plan_data as { weekStartDate?: string })?.weekStartDate === weekStart);
  if (!row) return null;
  const plan = normalizePlan(row.plan_data);
  // Plans saved before their recipes had ingredients: fill them in and save.
  const ids = mealsMissingIngredients(plan);
  if (ids.length) {
    const { data: recipes } = await supabase.from('recipes').select(RECIPE_SELECT).in('id', ids);
    if (recipes?.length && fillMissingIngredients(plan, recipes as unknown as RecipeRow[])) {
      await supabase.from('meal_plans').update({ plan_data: plan as unknown as Record<string, unknown> }).eq('id', row.id);
    }
  }
  return { id: row.id, plan };
}

export async function saveWeekPlan(plan: GeneratedMealPlan, prefs: MealPreferencesState, existingId: string | null): Promise<string> {
  const payload = {
    name: `Meal Plan — ${formatWeekRange(plan.weekStartDate)}`,
    plan_data: plan as unknown as Record<string, unknown>,
    preferences: prefs as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { error } = await supabase.from('meal_plans').update(payload).eq('id', existingId);
    if (error) throw error;
    return existingId;
  }
  const { data, error } = await supabase.from('meal_plans').insert(payload).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ---------- Recipes ----------

let recipeCache: RecipeRow[] | null = null;

export async function loadRecipes(force = false): Promise<RecipeRow[]> {
  if (recipeCache && !force) return recipeCache;
  // Every page (Supabase sends 1,000 rows at most), and only recipes that
  // have ingredients — the rest are still being written.
  const data = await fetchAllPages<RecipeRow>((from, to) =>
    supabase
      .from('recipes')
      .select(RECIPE_SELECT.replace('recipe_ingredients(', 'recipe_ingredients!inner('))
      .eq('is_active', true)
      .order('name', { ascending: true })
      .order('id')
      .range(from, to)
  );
  recipeCache = data;
  return recipeCache;
}

export function ingredientNames(r: RecipeRow): string[] {
  return r.recipe_ingredients.map((ri) => ri.ingredient?.name ?? '').filter(Boolean);
}

/** Allergens found in a recipe, from its tags and its ingredient names. */
export function recipeAllergens(r: RecipeRow): string[] {
  const tagged = (r.recipe_allergens ?? []).map((a) => a.allergen?.name ?? '').filter(Boolean);
  return Array.from(new Set([...tagged, ...detectAllergens(ingredientNames(r))]));
}

export function isSafeFor(r: RecipeRow, allergies: string[]): boolean {
  const tagged = (r.recipe_allergens ?? []).map((a) => a.allergen?.name ?? '').filter(Boolean);
  return !conflictsWithAllergies(ingredientNames(r), allergies, tagged);
}

export function fitsDiets(r: RecipeRow, diets: string[]): boolean {
  const ingredients = ingredientNames(r);
  const tags = (r.recipe_tags ?? []).map((t) => t.tag?.name ?? '').filter(Boolean);
  return diets.every((d) => fitsDiet(d, { ingredients, tags, protein: r.protein, carbs: r.carbs }));
}

export function recipeImage(r: { name: string; image_path: string | null }, type = 'dinner'): string {
  return r.image_path || getMealImage(r.name, type);
}

export function totalMinutes(r: { prep_time_minutes: number | null; cook_time_minutes: number | null }): number {
  return (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
}

function parseAmount(q: string | number | null | undefined): number | null {
  if (q == null || q === '') return null;
  const n = typeof q === 'number' ? q : Number(String(q).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function recipeNeeds(r: RecipeRow): Need[] {
  return r.recipe_ingredients
    .filter((ri) => ri.ingredient?.name)
    .map((ri) => ({ name: ri.ingredient!.name, quantity: parseAmount(ri.quantity), unit: ri.unit ?? '' }));
}

export function mealNeeds(m: MockMeal): Need[] {
  return m.ingredients.filter((i) => i.name).map((i: MealIngredient) => ({ name: i.name, quantity: parseAmount(i.quantity), unit: i.unit ?? '' }));
}

/** Checks a recipe against the pantry, scaled to the family's portions. */
export function checkRecipe(r: RecipeRow, pantry: PantryItem[], portions: number) {
  return checkNeeds(recipeNeeds(r), pantry, { factor: portions / (r.servings || portions) });
}

// ---------- Plans ----------

export async function buildLibraryPlan(prefs: MealPreferencesState, portions: number, pantry: PantryItem[], weekStart: string) {
  const recipes = await loadRecipes();
  return buildPlanFromRecipes(recipes, { preferences: prefs, householdSize: portions, weekStartDate: weekStart, pantryItems: pantry });
}

export class AIPlanError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Asks the AI chef (the generate-meal-plan function) for a plan. Counts toward the monthly limit. */
export async function buildAIPlan(prefs: MealPreferencesState, portions: number, pantry: PantryItem[], weekStart: string): Promise<GeneratedMealPlan> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new AIPlanError('Please sign in again.', 401);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-meal-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      planningDuration: prefs.planningDuration,
      mealTypes: prefs.mealTypes,
      householdSize: portions,
      weekStartDate: weekStart,
      dietaryPreferences: prefs.dietaryPreferences,
      allergies: prefs.allergies,
      cuisinePreferences: prefs.cuisinePreferences,
      usePantryFirst: prefs.usePantryFirst,
      pantryItems: pantry.map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit })),
    }),
  });
  const json = (await res.json().catch(() => null)) as
    | { days?: { dayIndex: number; dayName: string; date: string; meals: Record<string, unknown>[] }[]; error?: string }
    | null;
  if (!res.ok || !json?.days?.length) {
    throw new AIPlanError(json?.error ?? `The AI chef could not make a plan (${res.status}).`, res.status);
  }
  const plan = normalizePlan({
    id: newPlanId(),
    duration: prefs.planningDuration,
    weekStartDate: weekStart,
    days: json.days.map((d) => ({
      ...d,
      meals: (d.meals ?? []).map((m, i) => ({
        ...m,
        id: `${d.dayIndex}-${String(m.type ?? '')}-${i}`,
        image: getMealImage(String(m.name ?? ''), String(m.type ?? '')),
      })),
    })),
  });
  return withoutAllergies(plan, prefs, portions, pantry, weekStart);
}

/** True when an AI-written meal contains one of the family's allergies. */
export function mealConflicts(m: MockMeal, allergies: string[]): boolean {
  return conflictsWithAllergies(m.ingredients.map((i) => i.name), allergies);
}

/**
 * The AI chef is told about allergies and that Firdam is halal-only, but its
 * answer is checked too: any meal that contains a family allergy or isn't halal
 * is swapped for a safe library recipe of the same type.
 */
async function withoutAllergies(plan: GeneratedMealPlan, prefs: MealPreferencesState, portions: number, pantry: PantryItem[], weekStart: string): Promise<GeneratedMealPlan> {
  const allergies = prefs.allergies ?? [];
  // Also catches anything not halal (the server checks first; this is a backstop).
  const unsafe = (m: MockMeal) => mealConflicts(m, allergies) || !!mealHaramReason(m as unknown as Record<string, unknown>);
  if (!plan.days.some((d) => d.meals.some(unsafe))) return plan;
  const safe = await buildLibraryPlan(prefs, portions, pantry, weekStart).catch(() => null);
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      meals: d.meals.flatMap((m) => {
        if (!unsafe(m)) return [m];
        const swap = safe?.days.find((s) => s.date === d.date)?.meals.find((s) => s.type === m.type);
        return swap ? [swap] : [];
      }),
    })),
  };
}

// ---------- Shopping list ----------

export async function getShoppingList(): Promise<{ id: string; name: string }> {
  const { data } = await supabase.from('grocery_lists').select('id, name').order('created_at', { ascending: true }).limit(1);
  const first = (data ?? [])[0] as { id: string; name: string } | undefined;
  if (first) return first;
  const { data: created, error } = await supabase.from('grocery_lists').insert({ name: 'Weekly groceries' }).select('id, name').single();
  if (error) throw error;
  return created as { id: string; name: string };
}

export async function loadShoppingItems(listId: string): Promise<GroceryItem[]> {
  const { data, error } = await supabase.from('grocery_items').select('*').eq('list_id', listId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroceryItem[];
}

/**
 * Adds food to the list. Food already waiting on it gets the amounts added
 * together (2 potatoes + 3 potatoes → 5), converting units where needed.
 * Returns how many lines were added or topped up.
 */
export async function addShoppingItems(
  listId: string,
  items: { name: string; quantity: number | null; unit: string | null; fromMealPlan?: boolean }[],
  existing: GroceryItem[]
): Promise<number> {
  const incoming = mergeShortfalls([items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), quantity: i.quantity, unit: i.unit ?? '' }))]);
  const open = existing.filter((i) => !i.checked);
  const updates: { id: string; quantity: number | null; unit: string | null }[] = [];
  const rows: Record<string, unknown>[] = [];
  const fromPlan = items.some((i) => i.fromMealPlan);

  for (const item of incoming) {
    const key = ingredientKey(item.name);
    let merged = false;
    for (const row of open.filter((o) => ingredientKey(o.name) === key)) {
      const pending = updates.find((u) => u.id === row.id);
      const current = pending ?? { quantity: row.quantity, unit: row.unit };
      const sum = addAmounts(current, { quantity: item.quantity, unit: item.unit || null }, item.name);
      if (!sum) continue;
      merged = true;
      if (sum.quantity !== current.quantity || (sum.unit ?? null) !== (current.unit ?? null)) {
        const next = { id: row.id, quantity: sum.quantity, unit: sum.unit || null };
        if (pending) Object.assign(pending, next);
        else updates.push(next);
      }
      break;
    }
    if (!merged) {
      rows.push({
        list_id: listId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || null,
        category: guessCategory(item.name),
        checked: false,
        from_meal_plan: fromPlan,
      });
    }
  }

  if (rows.length) {
    const { error } = await supabase.from('grocery_items').insert(rows);
    if (error) throw error;
  }
  for (const u of updates) {
    const { error } = await supabase
      .from('grocery_items')
      .update({ quantity: u.quantity, unit: u.unit, updated_at: new Date().toISOString() })
      .eq('id', u.id);
    if (error) throw error;
  }
  return rows.length + updates.length;
}

export async function setItemChecked(id: string, checked: boolean) {
  const { error } = await supabase.from('grocery_items').update({ checked, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function removeCheckedItems(listId: string) {
  const { error } = await supabase.from('grocery_items').delete().eq('list_id', listId).eq('checked', true);
  if (error) throw error;
}

/**
 * What to buy for the rest of this week's plan: each meal's ingredients minus
 * what the pantry covers (counting what earlier meals use up), minus what an
 * earlier tap already put on the list for the plan — so tapping twice doesn't
 * double it.
 */
export function shoppingForPlan(plan: GeneratedMealPlan, pantry: PantryItem[], fromDate = formatDateISO(new Date()), listed: GroceryItem[] = []) {
  const ledger = new Ledger(pantry);
  const lists = plan.days
    .filter((d) => d.date >= fromDate)
    .flatMap((d) => d.meals)
    .map((m) => {
      const check = checkNeeds(mealNeeds(m), pantry, { ledger, commit: true });
      return check.lines.filter((l) => l.status === 'missing' || l.status === 'short').map((l) => l.shortfall ?? { name: l.need.name, quantity: l.scaled, unit: l.need.unit });
    });
  const forPlan = listed.filter((i) => i.from_meal_plan);
  return mergeShortfalls(lists).flatMap((need) => {
    const key = ingredientKey(need.name);
    let left: number | null = need.quantity;
    for (const item of forPlan.filter((i) => ingredientKey(i.name) === key)) {
      if (left == null || item.quantity == null) return []; // "some" is already on the list
      const have = toBase(item.quantity, item.unit || 'pieces', item.name);
      const want = toBase(left, need.unit || 'pieces', need.name);
      if (!have || !want) return [];
      const covered = convertBase(have.amount, have.base, want.base, need.name);
      if (covered == null) continue;
      const rest = want.amount - covered;
      if (rest <= want.amount * 0.05) return [];
      left = +((left * rest) / want.amount).toFixed(2);
    }
    return [{ ...need, quantity: left }];
  });
}
