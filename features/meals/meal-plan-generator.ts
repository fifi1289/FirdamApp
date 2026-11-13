import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  RECIPE_SELECT,
  fetchAllPages,
  buildPlanFromRecipes,
  mealsMissingIngredients,
  fillMissingIngredients,
  formatDateISO,
  repairPlan,
  type GeneratedMealPlan,
  type MealPlanGeneratorInput,
  type RecipeRow,
} from '@/features/meals/plan-core';

import type { MealPreferencesState } from '@/features/meals/meals-config';

export * from '@/features/meals/plan-core';

let libraryCache: Promise<RecipeRow[]> | null = null;

/** The whole recipe library, loaded once per visit (it's ~1,400 recipes). */
export function loadLibraryRecipes(force = false): Promise<RecipeRow[]> {
  if (!libraryCache || force) {
    const supabase = createSupabaseBrowserClient();
    libraryCache = fetchAllPages<RecipeRow>((from, to) =>
      supabase
        .from('recipes')
        .select(RECIPE_SELECT)
        .eq('is_active', true)
        // Never planned before its photo is ready.
        .not('image_path', 'is', null)
        .order('created_at', { ascending: true })
        .order('id')
        .range(from, to)
    ).catch((e: Error) => {
      libraryCache = null;
      throw new Error(`Failed to load recipes: ${e.message}`);
    });
  }
  return libraryCache;
}

export async function generateMealPlanFromSupabase(
  input: MealPlanGeneratorInput
): Promise<GeneratedMealPlan> {
  return buildPlanFromRecipes(await loadLibraryRecipes(), input);
}

/**
 * Plans saved before their recipes had ingredients show nothing to buy. This
 * fills those meals from the library and saves the plan back.
 */
export async function repairPlanIngredients(planId: string, plan: GeneratedMealPlan): Promise<GeneratedMealPlan> {
  const ids = mealsMissingIngredients(plan);
  if (!ids.length) return plan;
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.from('recipes').select(RECIPE_SELECT).in('id', ids);
  if (!data?.length || !fillMissingIngredients(plan, data as unknown as RecipeRow[])) return plan;
  await supabase.from('meal_plans').update({ plan_data: plan as unknown as Record<string, unknown> }).eq('id', planId);
  return plan;
}

/**
 * Plans saved before the planner's checks were stricter can hold a dinner in a
 * snack slot or a meal that doesn't fit the family's diet: those meals are
 * swapped from today on, and the plan is saved back. Same as the phone app.
 */
export async function repairPlanSlots(planId: string, plan: GeneratedMealPlan, preferences: MealPreferencesState, householdSize: number): Promise<GeneratedMealPlan> {
  const res = repairPlan(plan, await loadLibraryRecipes(), preferences, householdSize, formatDateISO(new Date()));
  if (!res.changed) return plan;
  const supabase = createSupabaseBrowserClient();
  await supabase.from('meal_plans').update({ plan_data: res.plan as unknown as Record<string, unknown> }).eq('id', planId);
  return res.plan;
}
