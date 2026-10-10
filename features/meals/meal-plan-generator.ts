import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  RECIPE_SELECT,
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
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load recipes: ${error.message}`);
  }
  return buildPlanFromRecipes((data ?? []) as unknown as RecipeRow[], input);
}
