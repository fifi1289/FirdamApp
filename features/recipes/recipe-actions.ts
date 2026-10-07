'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEFAULT_PREFERENCES } from '@/features/meals/meals-config';
import {
  formatDateISO,
  formatWeekRange,
  getStartOfWeek,
  normalizePlan,
  type GeneratedMealPlan,
  type MockMeal,
} from '@/features/meals/meal-plan-generator';
import { guessCategory } from '@/features/groceries/grocery-utils';
import { formatScaled, type MealTypeKey, type RecipeDetail } from '@/features/recipes/recipe-api';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function recipeToMeal(recipe: RecipeDetail, type: MealTypeKey, servings: number): MockMeal {
  const factor = servings / (recipe.servings || servings || 1);
  return {
    // Library recipes keep their uuid so the meal detail can load the full recipe.
    id: recipe.source === 'catalog' ? recipe.id : `u-${recipe.id}`,
    name: recipe.name,
    type,
    description: recipe.description ?? '',
    image: recipe.image,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity != null ? formatScaled(i.quantity, factor) : '',
      unit: i.unit,
    })),
    recipe: recipe.steps.map((s) => s.text),
    prepTime: recipe.prepMinutes,
    cookTime: recipe.cookMinutes,
    servings,
    difficulty: recipe.difficulty,
  };
}

function emptyWeek(weekStart: string): GeneratedMealPlan {
  const start = parseISO(weekStart);
  return {
    id: crypto.randomUUID(),
    duration: 7,
    weekStartDate: weekStart,
    days: DAY_NAMES.map((dayName, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { dayIndex: i, dayName, date: formatDateISO(d), meals: [] };
    }),
  };
}

/**
 * Puts a recipe into the meal plan for the week containing `date`, replacing
 * any meal of the same type that day. Creates the week's plan if needed.
 */
export async function addRecipeToPlan(
  recipe: RecipeDetail,
  date: string,
  type: MealTypeKey,
  servings: number
): Promise<{ created: boolean }> {
  const supabase = createSupabaseBrowserClient();
  const weekStart = formatDateISO(getStartOfWeek(parseISO(date)));
  const { data: plans, error } = await supabase
    .from('meal_plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  const existing = (plans ?? []).find(
    (p) => (p.plan_data as { weekStartDate?: string })?.weekStartDate === weekStart
  );
  const plan = existing ? normalizePlan(existing.plan_data as Record<string, unknown>) : emptyWeek(weekStart);

  let day = plan.days.find((d) => d.date === date);
  if (!day) {
    const d = parseISO(date);
    day = {
      dayIndex: (d.getDay() + 6) % 7,
      dayName: DAY_NAMES[(d.getDay() + 6) % 7]!,
      date,
      meals: [],
    };
    plan.days.push(day);
    plan.days.sort((a, b) => a.date.localeCompare(b.date));
    plan.duration = plan.days.length;
  }
  const meal = recipeToMeal(recipe, type, servings);
  const order: MealTypeKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  day.meals = [...day.meals.filter((m) => m.type !== type), meal].sort(
    (a, b) => order.indexOf(a.type as MealTypeKey) - order.indexOf(b.type as MealTypeKey)
  );

  const payload = {
    name: existing?.name ?? formatWeekRange(weekStart),
    plan_data: plan as unknown as Record<string, unknown>,
    preferences: (existing?.preferences as Record<string, unknown>) ?? {
      ...DEFAULT_PREFERENCES,
      weekStartDate: weekStart,
    },
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await supabase.from('meal_plans').update(payload).eq('id', existing.id)
    : await supabase.from('meal_plans').insert(payload);
  if (result.error) throw result.error;
  return { created: !existing };
}

/** Adds a recipe's ingredients (scaled) to the user's first shopping list. */
export async function addRecipeToShopping(recipe: RecipeDetail, servings: number): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  const factor = servings / (recipe.servings || servings || 1);
  const { data: lists } = await supabase
    .from('grocery_lists')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);
  let listId = lists?.[0]?.id;
  if (!listId) {
    const { data: created, error } = await supabase
      .from('grocery_lists')
      .insert({ name: 'Weekly groceries' })
      .select('id')
      .single();
    if (error) throw error;
    listId = created.id;
  }
  const rows = recipe.ingredients
    .filter((i) => !i.optional)
    .map((i) => ({
      list_id: listId!,
      name: i.name,
      quantity: i.quantity != null ? Math.round(i.quantity * factor * 100) / 100 : null,
      unit: i.unit || null,
      category: guessCategory(i.name),
      note: `For ${recipe.name}`,
      from_meal_plan: false,
    }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('grocery_items').insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Adds plain ingredient names (e.g. what's missing for a recipe) to the first shopping list. */
export async function addNamesToShopping(names: string[], note: string): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  const { data: lists } = await supabase
    .from('grocery_lists')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);
  let listId = lists?.[0]?.id;
  if (!listId) {
    const { data: created, error } = await supabase
      .from('grocery_lists')
      .insert({ name: 'Weekly groceries' })
      .select('id')
      .single();
    if (error) throw error;
    listId = created.id;
  }
  const rows = names.map((name) => ({
    list_id: listId!,
    name,
    category: guessCategory(name),
    note,
    from_meal_plan: false,
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('grocery_items').insert(rows);
  if (error) throw error;
  return rows.length;
}
