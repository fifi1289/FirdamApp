/**
 * Meal plan building blocks shared by the website and the iPhone/Android app.
 * Keep this file free of React, Next.js and Supabase imports: the app copies it
 * (run `node mobile/scripts/sync-shared.mjs`).
 */
import { getMealImage } from '@/features/meals/meal-images';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import { conflictsWithAllergies, fitsDiet } from '@/lib/recipes/allergens';
import { checkNeeds, Ledger, type PantryLike } from '@/supabase/functions/_shared/pantry-engine';

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
  pantryItems?: PantryLike[];
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

export interface RecipeRow {
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
  protein?: number | null;
  carbs?: number | null;
  recipe_allergens?: { allergen: { name: string } | null }[];
  recipe_tags?: { tag: { name: string } | null }[];
}

export const RECIPE_SELECT = `
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
  ),
  protein,
  carbs,
  recipe_allergens(allergen:allergens(name)),
  recipe_tags(tag:tags(name))
` as const;

function ingredientNames(r: RecipeRow): string[] {
  return r.recipe_ingredients.map((ri) => ri.ingredient?.name ?? '').filter(Boolean);
}

/** True when a recipe is safe for the family's allergies and fits every chosen diet. */
export function recipeSuits(r: RecipeRow, allergies: string[], diets: string[]): boolean {
  const ingredients = ingredientNames(r);
  const allergens = (r.recipe_allergens ?? []).map((a) => a.allergen?.name ?? '').filter(Boolean);
  if (conflictsWithAllergies(ingredients, allergies, allergens)) return false;
  const tags = (r.recipe_tags ?? []).map((t) => t.tag?.name ?? '').filter(Boolean);
  return diets.every((d) => fitsDiet(d, { ingredients, tags, protein: r.protein, carbs: r.carbs }));
}

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

/** Rounds a scaled amount sensibly: 2.25 → 2.25, 412.5 → 415, 3.333 → 3.33. */
function tidy(n: number): string {
  if (n >= 100) return String(Math.round(n / 5) * 5);
  if (n >= 10) return String(Math.round(n));
  return String(+n.toFixed(2));
}

function toMockMeal(recipe: RecipeRow, type: string, householdSize: number): MockMeal {
  // Amounts are scaled from the recipe's servings to the family's portions.
  const factor = householdSize / (recipe.servings || householdSize);
  const ingredients: MealIngredient[] = recipe.recipe_ingredients
    .map((ri) => ({
      name: ri.ingredient?.name ?? '',
      quantity: ri.quantity != null && Number(ri.quantity) > 0 ? tidy(Number(ri.quantity) * factor) : '',
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
    servings: householdSize,
    difficulty: normalizeDifficulty(recipe.difficulty?.name),
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Builds a plan from already-loaded library recipes. Pure: shared by the
 * website and the app (mobile/src/shared is a generated copy of this file).
 */
export function buildPlanFromRecipes(all: RecipeRow[], input: MealPlanGeneratorInput): GeneratedMealPlan {
  const { preferences, householdSize = 4, weekStartDate } = input;
  const { planningDuration, mealTypes } = preferences;

  if (all.length === 0) {
    throw new Error('No recipe found.');
  }
  // Allergies and diets are never relaxed: unsafe recipes are removed up front.
  const recipes = all.filter((r) =>
    recipeSuits(r, preferences.allergies ?? [], preferences.dietaryPreferences ?? [])
  );
  if (recipes.length === 0) {
    throw new Error(
      'No recipes in the library match these allergies and diets yet. Try removing a diet, or add your own recipes.'
    );
  }
  const cuisinePrefs = preferences.cuisinePreferences ?? {};

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
  // With "use pantry first", pick recipes the pantry can cover, keeping a running
  // count of what earlier meals in the plan have already used.
  const pantry = (input.pantryItems ?? []) as PantryLike[];
  const pantryFirst = !!preferences.usePantryFirst && pantry.length > 0;
  const ledger = new Ledger(pantry);
  const needsOf = (r: RecipeRow) =>
    r.recipe_ingredients
      .filter((ri) => ri.ingredient?.name)
      .map((ri) => ({ name: ri.ingredient!.name, quantity: ri.quantity != null && Number(ri.quantity) > 0 ? Number(ri.quantity) : null, unit: ri.unit ?? '' }));
  const factorOf = (r: RecipeRow) => householdSize / (r.servings || householdSize);

  for (let i = 0; i < planningDuration; i++) {
    const dayName = DAY_NAMES[i % DAY_NAMES.length];
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    const meals: MockMeal[] = lowerTypes.map((type, idx) => {
      let pool = byType[type] ?? recipes;
      // Prefer the chosen cuisines for this meal type, when there are enough of them.
      const wanted = (cuisinePrefs[type] ?? []).map((c) => c.toLowerCase());
      if (wanted.length > 0) {
        const preferred = pool.filter((r) => wanted.includes((r.cuisine?.name ?? '').toLowerCase()));
        if (preferred.some((r) => !usedIds.has(r.id))) pool = preferred;
      }
      let candidate: RecipeRow | undefined;

      const unused = pool.filter((r) => !usedIds.has(r.id));
      if (unused.length > 0 && pantryFirst) {
        const scored = shuffle(unused).map((r) => {
          const c = checkNeeds(needsOf(r), pantry, { factor: factorOf(r), ledger });
          const usesPantry = c.lines.filter((l) => l.item && (l.status === 'enough' || l.status === 'short')).length;
          return { r, score: c.missingCount * 2 + c.shortCount - usesPantry * 0.5 };
        });
        scored.sort((a, b) => a.score - b.score);
        // Keep some variety: choose among the best few.
        const top = scored.slice(0, Math.min(3, scored.length));
        candidate = top[Math.floor(Math.random() * top.length)]!.r;
        checkNeeds(needsOf(candidate), pantry, { factor: factorOf(candidate), ledger, commit: true });
      } else if (unused.length > 0) {
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
    id: newPlanId(),
    duration: planningDuration,
    weekStartDate: formatDateISO(start),
    days,
  };
}

/** A random id for a plan (works on the web and on phones). */
export function newPlanId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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

/**
 * Supabase returns at most 1,000 rows per request. This keeps asking for the
 * next page until it has everything. `page(from, to)` must use a stable order.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  size = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}
