'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Shape of a recipe passed to the AI planner — a subset of the full recipe
 * record with only the fields the planner needs to make selections.
 */
export interface AIPlannerRecipe {
  name: string;
  cuisine: string;
  type: string;
  description: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  recipe: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  dietaryTags: string[];
  allergyTags: string[];
}

export interface AIPlannerPantryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface AIPlannerRequest {
  recipes: AIPlannerRecipe[];
  planningDuration: number;
  mealTypes: string[];
  householdSize: number;
  weekStartDate: string;
  usePantryFirst: boolean;
  pantryItems?: AIPlannerPantryItem[];
  cuisinePreferences?: Record<string, string[]>;
  dietaryPreferences?: string[];
  allergies?: string[];
}

export interface AIPlannedMeal {
  recipeName: string;
  type: string;
}

export interface AIPlannedDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: AIPlannedMeal[];
}

export interface AIPlannerResponse {
  days: AIPlannedDay[];
}

export class AIPlannerError extends Error {
  readonly status: number;
  readonly details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'AIPlannerError';
    this.status = status;
    this.details = details;
  }
}

const FUNCTION_SLUG = 'meal-ai-planner';

function buildFunctionUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new AIPlannerError(
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
    throw new AIPlannerError(
      'You must be signed in to use the AI meal planner.',
      401
    );
  }
  return data.session.access_token;
}

/**
 * Calls the meal-ai-planner edge function, which securely forwards the
 * filtered recipe list to OpenAI and returns a structured meal plan.
 *
 * The OpenAI API key never leaves the server — the frontend only sends
 * recipe data and receives the planned schedule back.
 */
export async function requestAIPlan(
  input: AIPlannerRequest
): Promise<AIPlannerResponse> {
  const functionUrl = buildFunctionUrl();
  const accessToken = await getSessionToken();

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as
    | { days?: AIPlannedDay[]; error?: string; details?: string }
    | null;

  if (!res.ok) {
    const message = json?.error ?? `AI planner request failed (${res.status}).`;
    throw new AIPlannerError(message, res.status, json?.details);
  }

  if (!json || !Array.isArray(json.days)) {
    throw new AIPlannerError(
      'The AI planner returned an unexpected response.',
      502
    );
  }

  return { days: json.days };
}
