import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  RECIPE_SELECT,
  fetchAllPages,
  buildPlanFromRecipes,
  type GeneratedMealPlan,
  type MealPlanGeneratorInput,
  type RecipeRow,
} from '@/features/meals/plan-core';

export * from '@/features/meals/plan-core';

export async function generateMealPlanFromSupabase(
  input: MealPlanGeneratorInput
): Promise<GeneratedMealPlan> {
  const supabase = createSupabaseBrowserClient();
  const data = await fetchAllPages<RecipeRow>((from, to) =>
    supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .order('id')
      .range(from, to)
  ).catch((e: Error) => {
    throw new Error(`Failed to load recipes: ${e.message}`);
  });
  return buildPlanFromRecipes(data, input);
}
