'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealImage } from '@/features/meals/meal-images';
import type { UserRecipe } from '@/types/database';

export type RecipeSource = 'catalog' | 'mine' | 'community';
export type MealTypeKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface RecipeSummary {
  /** Route key: "c-<uuid>" for library recipes, "u-<uuid>" for user recipes. */
  key: string;
  id: string;
  source: RecipeSource;
  name: string;
  description: string | null;
  cuisine: string | null;
  mealType: MealTypeKey;
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  image: string;
  calories: number | null;
  author?: string | null;
  isOwn?: boolean;
}

export interface RecipeIngredientLine {
  name: string;
  quantity: number | null;
  unit: string;
  optional?: boolean;
  notes?: string | null;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: RecipeIngredientLine[];
  steps: { text: string; minutes: number | null }[];
  tips: string[];
  equipment: string[];
  tags: string[];
  allergens: string[];
  nutrition: { label: string; value: number; unit: string }[];
  storage: string | null;
  reheating: string | null;
  isPublic?: boolean;
  userRecipe?: UserRecipe;
}

export function mealTypeKey(name: string | null | undefined): MealTypeKey {
  const n = (name ?? '').toLowerCase();
  if (n.startsWith('break')) return 'breakfast';
  if (n.startsWith('lunch')) return 'lunch';
  if (n.startsWith('snack') || n.startsWith('dessert')) return 'snack';
  return 'dinner';
}

function difficultyOf(name: string | null | undefined): Difficulty {
  const n = (name ?? '').toLowerCase();
  if (n.startsWith('easy')) return 'Easy';
  if (n.startsWith('hard')) return 'Hard';
  return 'Medium';
}

const SUMMARY_SELECT = `
  id, name, short_description, image_path, prep_time_minutes, cook_time_minutes, servings, calories,
  cuisine:cuisines(name), meal_type:meal_types(name), difficulty:difficulties(name)
` as const;

interface CatalogRow {
  id: string;
  name: string;
  short_description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  cuisine: { name: string } | null;
  meal_type: { name: string } | null;
  difficulty: { name: string } | null;
}

function catalogSummary(r: CatalogRow): RecipeSummary {
  const mealType = mealTypeKey(r.meal_type?.name);
  return {
    key: `c-${r.id}`,
    id: r.id,
    source: 'catalog',
    name: r.name,
    description: r.short_description,
    cuisine: r.cuisine?.name ?? null,
    mealType,
    difficulty: difficultyOf(r.difficulty?.name),
    prepMinutes: r.prep_time_minutes ?? 0,
    cookMinutes: r.cook_time_minutes ?? 0,
    servings: r.servings ?? 4,
    image: r.image_path || getMealImage(r.name, mealType),
    calories: r.calories != null ? Number(r.calories) : null,
  };
}

export function userSummary(r: UserRecipe, currentUserId: string | null): RecipeSummary {
  const own = r.user_id === currentUserId;
  return {
    key: `u-${r.id}`,
    id: r.id,
    source: own ? 'mine' : 'community',
    name: r.name,
    description: r.description,
    cuisine: r.cuisine,
    mealType: r.meal_type,
    difficulty: r.difficulty,
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    servings: r.servings,
    image: r.image_url || getMealImage(r.name, r.meal_type),
    calories: null,
    author: r.author_name,
    isOwn: own,
  };
}

export async function fetchAllRecipes(): Promise<{ recipes: RecipeSummary[]; userId: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [catalog, mine] = await Promise.all([
    supabase.from('recipes').select(SUMMARY_SELECT).eq('is_active', true).order('name'),
    supabase.from('user_recipes').select('*').order('created_at', { ascending: false }),
  ]);
  if (catalog.error) console.error('Failed to load recipes:', catalog.error.message);
  if (mine.error) console.error('Failed to load user recipes:', mine.error.message);
  const recipes = [
    ...((mine.data ?? []) as UserRecipe[]).map((r) => userSummary(r, user?.id ?? null)),
    ...((catalog.data ?? []) as unknown as CatalogRow[]).map(catalogSummary),
  ];
  return { recipes, userId: user?.id ?? null };
}

const DETAIL_SELECT = `
  id, name, short_description, long_description, image_path, prep_time_minutes, cook_time_minutes,
  servings, calories, protein, carbs, fat, fiber, sugar, sodium, cholesterol,
  storage_instructions, reheating_instructions,
  cuisine:cuisines(name), meal_type:meal_types(name), difficulty:difficulties(name),
  recipe_ingredients(quantity, unit, optional, display_order, notes, ingredient:ingredients(name)),
  recipe_steps(step_number, instruction, estimated_minutes),
  recipe_tips(tip, display_order),
  recipe_equipment(equipment, display_order),
  recipe_tags(tag:tags(name)),
  recipe_allergens(allergen:allergens(name))
` as const;

interface DetailRow extends CatalogRow {
  long_description: string | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  cholesterol: number | null;
  storage_instructions: string | null;
  reheating_instructions: string | null;
  recipe_ingredients: {
    quantity: number | null;
    unit: string | null;
    optional: boolean | null;
    display_order: number | null;
    notes: string | null;
    ingredient: { name: string } | null;
  }[];
  recipe_steps: { step_number: number; instruction: string; estimated_minutes: number | null }[];
  recipe_tips: { tip: string; display_order: number | null }[];
  recipe_equipment: { equipment: string; display_order: number | null }[];
  recipe_tags: { tag: { name: string } | null }[];
  recipe_allergens: { allergen: { name: string } | null }[];
}

const NUTRITION: { key: keyof DetailRow; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

export async function fetchRecipe(key: string): Promise<RecipeDetail | null> {
  const supabase = createSupabaseBrowserClient();
  const id = key.slice(2);
  if (key.startsWith('u-')) {
    const [{ data }, { data: auth }] = await Promise.all([
      supabase.from('user_recipes').select('*').eq('id', id).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    if (!data) return null;
    const r = data as UserRecipe;
    return {
      ...userSummary(r, auth.user?.id ?? null),
      ingredients: (r.ingredients ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity !== '' && !Number.isNaN(Number(i.quantity)) ? Number(i.quantity) : null,
        unit: i.unit || (Number.isNaN(Number(i.quantity)) ? i.quantity : ''),
      })),
      steps: (r.steps ?? []).map((text) => ({ text, minutes: null })),
      tips: r.tips ? [r.tips] : [],
      equipment: [],
      tags: [],
      allergens: [],
      nutrition: [],
      storage: null,
      reheating: null,
      isPublic: r.is_public,
      userRecipe: r,
    };
  }

  const { data, error } = await supabase.from('recipes').select(DETAIL_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const r = data as unknown as DetailRow;
  return {
    ...catalogSummary(r),
    description: r.short_description ?? r.long_description,
    ingredients: r.recipe_ingredients
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .filter((i) => i.ingredient?.name)
      .map((i) => ({
        name: i.ingredient!.name,
        quantity: i.quantity != null ? Number(i.quantity) : null,
        unit: i.unit ?? '',
        optional: i.optional ?? false,
        notes: i.notes,
      })),
    steps: r.recipe_steps
      .slice()
      .sort((a, b) => a.step_number - b.step_number)
      .map((s) => ({ text: s.instruction, minutes: s.estimated_minutes })),
    tips: r.recipe_tips
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((t) => t.tip),
    equipment: r.recipe_equipment
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((e) => e.equipment),
    tags: r.recipe_tags.map((t) => t.tag?.name).filter(Boolean) as string[],
    allergens: r.recipe_allergens.map((a) => a.allergen?.name).filter(Boolean) as string[],
    nutrition: NUTRITION.filter((n) => r[n.key] != null).map((n) => ({
      label: n.label,
      value: Number(r[n.key]),
      unit: n.unit,
    })),
    storage: r.storage_instructions,
    reheating: r.reheating_instructions,
  };
}

/** Scales a quantity and formats it nicely (e.g. 1.5 → "1½"). */
export function formatScaled(quantity: number | null, factor: number): string {
  if (quantity == null) return '';
  const v = quantity * factor;
  const whole = Math.floor(v);
  const frac = v - whole;
  const fractions: [number, string][] = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [0.5, '½'],
    [0.667, '⅔'],
    [0.75, '¾'],
  ];
  if (v >= 10 || frac < 0.06) return String(Math.round(v));
  if (frac > 0.94) return String(whole + 1);
  const match = fractions.find(([f]) => Math.abs(frac - f) < 0.06);
  if (match) return `${whole > 0 ? whole : ''}${match[1]}`;
  return v.toFixed(1).replace(/\.0$/, '');
}

export function totalMinutes(r: Pick<RecipeSummary, 'prepMinutes' | 'cookMinutes'>): number {
  return (r.prepMinutes || 0) + (r.cookMinutes || 0);
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
