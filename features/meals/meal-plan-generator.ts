import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealImage } from '@/features/meals/meal-images';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import type { PantryItem } from '@/types/database';

export type MealDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface MockMeal {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
  ingredients: MealIngredient[];
  recipe: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: MealDifficulty;
}

export interface MockDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: MockMeal[];
}

export interface GeneratedMealPlan {
  id: string;
  duration: number;
  weekStartDate: string;
  days: MockDay[];
}

export interface MealPlanGeneratorInput {
  preferences: MealPreferencesState;
  householdSize?: number;
  weekStartDate: string;
  pantryItems?: PantryItem[];
}

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatWeekRange(weekStartDate: string): string {
  const start = parseDateLocal(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `Week of ${startLabel} \u2013 ${endLabel}`;
}

interface RecipeRow {
  id: string;
  name: string;
  short_description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  cuisine: { name: string } | null;
  meal_type: { name: string } | null;
  difficulty: { name: string } | null;
  recipe_ingredients: {
    quantity: number | null;
    unit: string | null;
    ingredient: { name: string } | null;
  }[];
  recipe_steps: { step_number: number; instruction: string }[];
}

const RECIPE_SELECT = `
  id,
  name,
  short_description,
  image_path,
  prep_time_minutes,
  cook_time_minutes,
  servings,
  cuisine:cuisines(name),
  meal_type:meal_types(name),
  difficulty:difficulties(name),
  recipe_ingredients(
    quantity,
    unit,
    ingredient:ingredients(name)
  ),
  recipe_steps(
    step_number,
    instruction
  )
` as const;

function normalizeDifficulty(name: string | null | undefined): MealDifficulty {
  if (!name) return 'Medium';
  const lower = name.toLowerCase();
  if (lower.startsWith('easy')) return 'Easy';
  if (lower.startsWith('hard')) return 'Hard';
  return 'Medium';
}

function mealTypeKey(name: string | null): string {
  if (!name) return 'dinner';
  const lower = name.toLowerCase();
  if (lower.startsWith('break')) return 'breakfast';
  if (lower.startsWith('lunch')) return 'lunch';
  if (lower.startsWith('dinner')) return 'dinner';
  if (lower.startsWith('snack')) return 'snack';
  return lower;
}

function toMockMeal(recipe: RecipeRow, type: string, householdSize: number): MockMeal {
  const ingredients: MealIngredient[] = recipe.recipe_ingredients
    .map((ri) => ({
      name: ri.ingredient?.name ?? '',
      quantity: ri.quantity != null ? String(ri.quantity) : '',
      unit: ri.unit ?? '',
    }))
    .filter((i) => i.name);

  const recipeSteps: string[] = recipe.recipe_steps
    .slice()
    .sort((a, b) => a.step_number - b.step_number)
    .map((s) => s.instruction);

  return {
    id: recipe.id,
    name: recipe.name,
    type,
    description: recipe.short_description ?? '',
    image: recipe.image_path || getMealImage(recipe.name, type),
    ingredients,
    recipe: recipeSteps,
    prepTime: recipe.prep_time_minutes ?? 0,
    cookTime: recipe.cook_time_minutes ?? 0,
    servings: recipe.servings ?? householdSize,
    difficulty: normalizeDifficulty(recipe.difficulty?.name),
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function generateMealPlanFromSupabase(
  input: MealPlanGeneratorInput
): Promise<GeneratedMealPlan> {
  const { preferences, householdSize = 4, weekStartDate } = input;
  const { planningDuration, mealTypes } = preferences;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load recipes: ${error.message}`);
  }

  const recipes = (data ?? []) as unknown as RecipeRow[];
  if (recipes.length === 0) {
    throw new Error('No recipe found.');
  }

  const start = parseDateLocal(weekStartDate);
  const days: MockDay[] = [];

  const byType: Record<string, RecipeRow[]> = {};
  const allTypes = mealTypes.length > 0 ? mealTypes : ['breakfast', 'lunch', 'dinner'];
  const lowerTypes = allTypes.map((t) => t.toLowerCase());

  for (const recipe of recipes) {
    const key = mealTypeKey(recipe.meal_type?.name ?? '');
    if (!byType[key]) byType[key] = [];
    byType[key].push(recipe);
  }

  const rotationCursors: Record<string, number> = {};
  const usedIds = new Set<string>();

  for (let i = 0; i < planningDuration; i++) {
    const dayName = DAY_NAMES[i % DAY_NAMES.length];
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    const meals: MockMeal[] = lowerTypes.map((type, idx) => {
      let pool = byType[type] ?? recipes;
      let candidate: RecipeRow | undefined;

      const unused = pool.filter((r) => !usedIds.has(r.id));
      if (unused.length > 0) {
        const shuffled = shuffle(unused);
        candidate = shuffled[0];
      } else {
        const cursor = rotationCursors[type] ?? 0;
        candidate = pool[cursor % pool.length];
        rotationCursors[type] = cursor + 1;
      }

      if (!candidate) {
        candidate = recipes[i % recipes.length];
      }

      usedIds.add(candidate.id);
      return toMockMeal(candidate, type, householdSize);
    });

    days.push({
      dayIndex: i,
      dayName,
      date: formatDateISO(date),
      meals,
    });
  }

  return {
    id: crypto.randomUUID(),
    duration: planningDuration,
    weekStartDate: formatDateISO(start),
    days,
  };
}

export function normalizeMeal(meal: Record<string, unknown>): MockMeal {
  const rawIngredients = (meal.ingredients as unknown[]) ?? [];
  const ingredients: MealIngredient[] = rawIngredients.map((ing) => {
    if (typeof ing === 'string') {
      return { name: ing, quantity: '', unit: '' };
    }
    const obj = ing as Record<string, string>;
    return {
      name: obj.name ?? '',
      quantity: obj.quantity ?? '',
      unit: obj.unit ?? '',
    };
  });

  const rawRecipe = meal.recipe;
  const recipe: string[] =
    typeof rawRecipe === 'string'
      ? rawRecipe
          .split(/(?<=[.])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(rawRecipe)
        ? (rawRecipe as string[]).map((s) => String(s))
        : [];

  const difficulty = meal.difficulty as MealDifficulty | undefined;

  return {
    id: String(meal.id ?? ''),
    name: String(meal.name ?? ''),
    type: String(meal.type ?? ''),
    description: String(meal.description ?? ''),
    image: String(meal.image ?? ''),
    ingredients,
    recipe,
    prepTime: Number(meal.prepTime ?? 0),
    cookTime: Number(meal.cookTime ?? 0),
    servings: Number(meal.servings ?? 4),
    difficulty: difficulty ?? 'Medium',
  };
}

export function normalizePlan(data: Record<string, unknown>): GeneratedMealPlan {
  const rawDays = (data.days as Record<string, unknown>[]) ?? [];
  const today = getStartOfWeek();
  return {
    id: String(data.id ?? ''),
    duration: Number(data.duration ?? 0),
    weekStartDate: String(data.weekStartDate ?? formatDateISO(today)),
    days: rawDays.map((day) => ({
      dayIndex: Number(day.dayIndex ?? 0),
      dayName: String(day.dayName ?? ''),
      date: String(day.date ?? ''),
      meals: ((day.meals as Record<string, unknown>[]) ?? []).map(normalizeMeal),
    })),
  };
}
