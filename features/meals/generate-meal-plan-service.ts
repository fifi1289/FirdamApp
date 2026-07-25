'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealImage } from '@/features/meals/meal-images';
import type { MealDifficulty } from '@/features/meals/meal-plan-generator';
import type {
  GeneratedMealPlan,
  MealIngredient,
  MockDay,
  MockMeal,
} from '@/features/meals/meal-plan-generator';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import type { PantryItem } from '@/types/database';

const FUNCTION_SLUG = 'generate-meal-plan';
const VALID_DIFFICULTIES: MealDifficulty[] = ['Easy', 'Medium', 'Hard'];

export interface GenerateMealPlanInput {
  preferences: MealPreferencesState;
  householdSize?: number;
  weekStartDate: string;
  pantryItems?: PantryItem[];
}

export class GenerateMealPlanError extends Error {
  readonly status: number;
  readonly details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'GenerateMealPlanError';
    this.status = status;
    this.details = details;
  }
}

interface EdgeMeal {
  type: string;
  name: string;
  cuisine?: string;
  description?: string;
  ingredients?: { name: string; quantity: string; unit: string }[];
  recipe?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
}

interface EdgeDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: EdgeMeal[];
}

interface EdgeResponse {
  days: EdgeDay[];
}

function buildFunctionUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new GenerateMealPlanError(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable.',
      500
    );
  }
  return `${url}/functions/v1/${FUNCTION_SLUG}`;
}

async function getSessionToken(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new GenerateMealPlanError(
      'You must be signed in to generate a meal plan.',
      401
    );
  }
  return data.session.access_token;
}

function normalizeIngredients(raw: EdgeMeal['ingredients']): MealIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((ing) => ({
    name: String(ing?.name ?? ''),
    quantity: String(ing?.quantity ?? ''),
    unit: String(ing?.unit ?? ''),
  }));
}

function normalizeDifficulty(value: string | undefined): MealDifficulty {
  if (value && VALID_DIFFICULTIES.includes(value as MealDifficulty)) {
    return value as MealDifficulty;
  }
  return 'Medium';
}

function mapEdgeMeal(meal: EdgeMeal, dayIndex: number, mealIdx: number): MockMeal {
  const name = String(meal.name ?? 'Meal');
  const type = String(meal.type ?? '');
  return {
    id: `${dayIndex}-${type}-${mealIdx}`,
    name,
    type,
    description: String(meal.description ?? ''),
    image: getMealImage(name, type),
    ingredients: normalizeIngredients(meal.ingredients),
    recipe: Array.isArray(meal.recipe)
      ? meal.recipe.map((s) => String(s))
      : [],
    prepTime: Number(meal.prepTime ?? 0),
    cookTime: Number(meal.cookTime ?? 0),
    servings: Number(meal.servings ?? 4),
    difficulty: normalizeDifficulty(meal.difficulty),
  };
}

function mapEdgeResponse(
  data: EdgeResponse,
  input: GenerateMealPlanInput
): GeneratedMealPlan {
  const days: MockDay[] = (data.days ?? []).map((day) => ({
    dayIndex: Number(day.dayIndex ?? 0),
    dayName: String(day.dayName ?? ''),
    date: String(day.date ?? ''),
    meals: (day.meals ?? []).map((meal, idx) =>
      mapEdgeMeal(meal, Number(day.dayIndex ?? 0), idx)
    ),
  }));

  return {
    id: crypto.randomUUID(),
    duration: input.preferences.planningDuration,
    weekStartDate: input.weekStartDate,
    days,
  };
}

/**
 * Calls the generate-meal-plan edge function, which uses OpenAI to produce a
 * complete halal meal plan from the user's preferences. The OpenAI API key
 * stays server-side — the frontend only sends preferences and receives the
 * plan back.
 */
export async function requestGeneratedMealPlan(
  input: GenerateMealPlanInput
): Promise<GeneratedMealPlan> {
  const { preferences, householdSize = 4, weekStartDate, pantryItems = [] } =
    input;

  const functionUrl = buildFunctionUrl();
  const accessToken = await getSessionToken();

  const payload = {
    planningDuration: preferences.planningDuration,
    mealTypes: preferences.mealTypes,
    householdSize,
    weekStartDate,
    dietaryPreferences: preferences.dietaryPreferences,
    allergies: preferences.allergies,
    cuisinePreferences: preferences.cuisinePreferences,
    usePantryFirst: preferences.usePantryFirst,
    pantryItems: pantryItems.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
    })),
  };

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => null)) as
    | EdgeResponse
    | { error?: string; details?: string }
    | null;

  if (!res.ok) {
    const errorObj = json as { error?: string; details?: string } | null;
    const message =
      errorObj?.error ?? `Meal plan request failed (${res.status}).`;
    throw new GenerateMealPlanError(message, res.status, errorObj?.details);
  }

  const planData = json as EdgeResponse | null;
  if (!planData || !Array.isArray(planData.days) || planData.days.length === 0) {
    throw new GenerateMealPlanError(
      'The meal plan service returned an unexpected response.',
      502
    );
  }

  return mapEdgeResponse(planData, input);
}
