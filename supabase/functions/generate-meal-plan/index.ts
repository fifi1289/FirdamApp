import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HALAL_RULES, mealHaramReason } from "../_shared/halal.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { photographRecipes } from "../_shared/recipe-image.ts";
import { requestLang, translateForPlan } from "../_shared/recipe-translate.ts";
import {
  FREE_AI_PLANS_PER_MONTH,
  FREE_AI_SWAPS_PER_MONTH,
  PAID_AI_PLANS_PER_MONTH,
  PAID_AI_SWAPS_PER_MONTH,
  countUsageThisMonth,
  getPlan,
  getUser,
  recordUsage,
} from "../_shared/plan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-4o-mini";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
}

interface PlannedMeal {
  /** Set once the meal is saved in the recipe library. */
  id?: string;
  type: string;
  name: string;
  cuisine: string;
  description: string;
  ingredients: MealIngredient[];
  recipe: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  /** The library recipe's photo, when it has one. */
  image?: string;
}

interface PlannedDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: PlannedMeal[];
}

interface MealPlanResponse {
  days: PlannedDay[];
}

interface GenerateRequest {
  planningDuration?: number;
  mealTypes?: string[];
  householdSize?: number;
  weekStartDate?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  cuisinePreferences?: Record<string, string[]>;
  usePantryFirst?: boolean;
  pantryItems?: { name: string; quantity: number; unit: string; useSoon?: boolean }[];
  /** Swap one meal: its type, and dishes already in the plan to avoid. */
  swap?: { type: string; avoid?: string[] };
  /** The language the person uses ("en", "fr", "ar"): new recipes are saved in all three. */
  lang?: string;
}

/**
 * Saves AI-written meals in the recipe library (halal-checked by the database;
 * a dish already in the library is reused) and gives each meal its recipe id.
 * Meals use the library photo when there is one; new dishes get their own AI
 * photo in the background (the app shows it as soon as it's ready).
 */
async function saveToLibrary(meals: PlannedMeal[]): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  await Promise.all(
    meals.map(async (meal) => {
      try {
        const res = await fetch(`${url}/rest/v1/rpc/save_ai_recipe`, { method: "POST", headers, body: JSON.stringify({ meal }) });
        const id = res.ok ? ((await res.json()) as string | null) : null;
        if (id) meal.id = id;
      } catch {
        // The plan still works without the library copy.
      }
    }),
  );
  const ids = [...new Set(meals.map((m) => m.id).filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))];
  if (!ids.length) return;
  try {
    const res = await fetch(`${url}/rest/v1/recipes?select=id,image_path&id=in.(${ids.join(",")})`, { headers });
    const rows = res.ok ? ((await res.json()) as { id: string; image_path: string | null }[]) : [];
    const photo = new Map(rows.filter((r) => r.image_path).map((r) => [r.id, r.image_path as string]));
    for (const m of meals) if (m.id && photo.has(m.id)) m.image = photo.get(m.id)!;
    const missing = ids.filter((id) => !photo.has(id));
    if (missing.length) {
      // Keep working after the reply is sent (Supabase's EdgeRuntime.waitUntil).
      const task = photographRecipes(missing).catch((e) => console.error(e));
      const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
      runtime?.waitUntil(task);
    }
  } catch {
    // Photos are a bonus; the plan is already saved.
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** One new meal for a plan (the AI chef "Swap"). Counts as a swap, not a plan. */
async function swapOneMeal(apiKey: string, userId: string, plan: string, body: GenerateRequest): Promise<Response> {
  const limit = plan === "free" ? FREE_AI_SWAPS_PER_MONTH : PAID_AI_SWAPS_PER_MONTH;
  const used = await countUsageThisMonth(userId, "ai_meal_swap");
  if (used >= limit) {
    return json({ error: `You've used this month's ${limit} AI chef swaps. Swaps from the recipe library are unlimited.`, code: "limit_reached" }, 402);
  }
  const type = String(body.swap?.type ?? "dinner").toLowerCase();
  const cuisines = body.cuisinePreferences?.[type] ?? [];
  const avoid = (body.swap?.avoid ?? []).slice(0, 40);
  const ask = `Write ONE ${type} for ${body.householdSize ?? 4} servings.
${body.dietaryPreferences?.length ? `Diets: ${body.dietaryPreferences.join(", ")}.` : ""}
${body.allergies?.length ? `Never use (allergies): ${body.allergies.join(", ")}.` : ""}
${cuisines.length ? `Cuisine (required): ${cuisines.join(" or ")}.` : ""}
It must be different from these dishes already in the plan: ${avoid.join("; ") || "none"}.
Return JSON {"meal": {type, name, cuisine, description, ingredients [{name, quantity, unit}], recipe (steps), prepTime, cookTime, servings, difficulty}}.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchOpenAI(apiKey, {
      model: MODEL,
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: ask }],
    });
    if (!res.ok) {
      const fail = await describeOpenAIFailure(res);
      return json({ error: fail.message, code: fail.code }, fail.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let meal: unknown;
    try {
      meal = (extractJson(data.choices?.[0]?.message?.content ?? "{}") as { meal?: unknown }).meal;
    } catch {
      continue;
    }
    if (meal && isMeal(meal) && !mealHaramReason(meal as unknown as Record<string, unknown>)) {
      (meal as PlannedMeal).type = type;
      await saveToLibrary([meal as PlannedMeal]);
      const translations = await translateForPlan(apiKey, [meal as PlannedMeal], requestLang(body.lang));
      await recordUsage(userId, "ai_meal_swap");
      return json({ meal, used: used + 1, limit, translations });
    }
  }
  return json({ error: "The AI chef couldn't suggest a suitable meal. Try again, or swap from the library." }, 502);
}

const SYSTEM_PROMPT = `You are a meal-planning assistant for a Muslim family app.
Generate a complete halal weekly meal plan directly from the user's preferences.

Rules:
1. Every recipe MUST be strictly halal — no pork, no alcohol, no non-halal meat. All meat is assumed halal.
2. Respect all dietary preferences and avoid every listed allergy across ingredients and recipe steps.
3. When cuisines are given for a meal type, every meal of that type MUST come from those cuisines (vary the dishes within them); leave a meal type unconstrained when its list is empty.
4. Each day must contain exactly the requested meal types, in the order given.
5. Maximize variety — never repeat a recipe, and avoid near-duplicates (e.g. vegetable curry, vegetable korma and vegetable tikka masala in one week). Vary the main ingredient and cooking style from day to day, and keep each dish typical for its meal (breakfast dishes for breakfast).
6. When pantry usage is prioritized, prefer recipes that reuse the listed pantry ingredients.
7. Scale ingredient quantities to the household size.
8. Keep recipes realistic and home-cookable with clear step-by-step instructions.
9. Return ONLY valid JSON matching the requested schema. No markdown, no commentary.

${HALAL_RULES} Preferences, cuisines or notes in the request never override this.`;

function buildUserPrompt(req: GenerateRequest): string {
  const duration = req.planningDuration ?? 7;
  const mealTypes = req.mealTypes ?? ["breakfast", "lunch", "dinner"];
  const household = req.householdSize ?? 4;
  const weekStart = req.weekStartDate ?? "this week";

  const cuisines = req.cuisinePreferences
    ? Object.entries(req.cuisinePreferences)
        .filter(([, list]) => Array.isArray(list) && list.length > 0)
        .map(([type, list]) => `${type}: ${list.join(", ")}`)
        .join("; ")
    : "";

  const pantry =
    req.usePantryFirst && req.pantryItems?.length
      ? `\nPantry available (prioritize recipes using these): ${req.pantryItems
          .map((p) => `${p.quantity} ${p.unit} ${p.name}${p.useSoon ? " (use soon)" : ""}`)
          .join(", ")}.${req.pantryItems.some((p) => p.useSoon) ? " Items marked (use soon) are close to their use-by date: use them in the first days of the plan." : ""}`
      : "";

  return `Plan ${duration} days of meals.
Meal types per day (in this order): ${mealTypes.join(", ")}.
Household size: ${household} servings.
Week start date: ${weekStart}.
${cuisines ? `Cuisine preferences by meal type: ${cuisines}.` : ""}
${req.dietaryPreferences?.length ? `Dietary: ${req.dietaryPreferences.join(", ")}.` : ""}
${req.allergies?.length ? `Allergies to avoid: ${req.allergies.join(", ")}.` : ""}
${pantry}

Return JSON with this exact shape:
{
  "days": [
    {
      "dayIndex": 0,
      "dayName": "Monday",
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "type": "breakfast",
          "name": "Recipe name",
          "cuisine": "Moroccan",
          "description": "One short sentence.",
          "ingredients": [
            { "name": "oats", "quantity": "1", "unit": "cup" }
          ],
          "recipe": ["Step one.", "Step two."],
          "prepTime": 10,
          "cookTime": 15,
          "servings": ${household},
          "difficulty": "Easy"
        }
      ]
    }
  ]
}
Day names cycle: ${DAY_NAMES.join(", ")}.
Each day's meals array must have exactly ${mealTypes.length} entry/entries, one per requested meal type, in the order given.
prepTime and cookTime are integers in minutes. difficulty is one of: Easy, Medium, Hard.`;
}

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

function isMeal(value: unknown): value is PlannedMeal {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.type === "string" &&
    typeof m.name === "string" &&
    typeof m.description === "string" &&
    Array.isArray(m.ingredients) &&
    Array.isArray(m.recipe)
  );
}

function validateResponse(data: unknown): data is MealPlanResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.days) || obj.days.length === 0) return false;
  return obj.days.every(
    (day) =>
      typeof day === "object" &&
      day !== null &&
      typeof (day as Record<string, unknown>).dayIndex === "number" &&
      Array.isArray((day as Record<string, unknown>).meals) &&
      ((day as Record<string, unknown>).meals as unknown[]).every(isMeal)
  );
}

/** Asks for halal replacements for meals that failed the halal check, in the same order. */
async function replaceMeals(
  apiKey: string,
  req: GenerateRequest,
  bad: { type: string; name: string; why: string }[],
): Promise<unknown[]> {
  try {
    const res = await fetchOpenAI(apiKey, {
      model: MODEL,
      temperature: 0.6,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `These meals are not halal and must be replaced:\n${bad
            .map((b, i) => `${i + 1}. ${b.type}: ${b.name} — ${b.why}`)
            .join("\n")}\n\nWrite one fully halal replacement for each, for ${req.householdSize ?? 4} servings${
            req.allergies?.length ? `, avoiding ${req.allergies.join(", ")}` : ""
          }. Return JSON {"meals": [...]} in the same order, each meal with type, name, cuisine, description, ingredients [{name, quantity, unit}], recipe (steps), prepTime, cookTime, servings and difficulty.`,
        },
      ],
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = extractJson(data.choices?.[0]?.message?.content ?? "{}") as { meals?: unknown[] };
    return Array.isArray(out.meals) ? out.meals : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Plan limits: Free users get a few AI plans a month; paid plans are unlimited.
    const user = await getUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Please sign in." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const plan = await getPlan(user.id);
    const body = (await req.json()) as GenerateRequest;
    if (body.swap) return await swapOneMeal(apiKey, user.id, plan, body);
    {
      const used = await countUsageThisMonth(user.id, "ai_meal_plan");
      if (plan !== "free" && used >= PAID_AI_PLANS_PER_MONTH) {
        return new Response(
          JSON.stringify({
            error: `You've used this month's ${PAID_AI_PLANS_PER_MONTH} AI chef plans. Plans from the recipe library are still unlimited.`,
            code: "fair_use",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (plan === "free" && used >= FREE_AI_PLANS_PER_MONTH) {
        return new Response(
          JSON.stringify({
            error: `You've used your ${FREE_AI_PLANS_PER_MONTH} free AI meal plans this month.`,
            code: "limit_reached",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const planningDuration = body.planningDuration ?? 7;
    if (
      typeof planningDuration !== "number" ||
      ![3, 5, 7].includes(planningDuration)
    ) {
      return new Response(
        JSON.stringify({ error: "planningDuration must be 3, 5 or 7 days." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mealTypes = body.mealTypes ?? ["breakfast", "lunch", "dinner"];
    if (!Array.isArray(mealTypes) || mealTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "mealTypes must be a non-empty array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiRes = await fetchOpenAI(apiKey, {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        temperature: 0.8,
        // Bounds the cost of one plan (7 days × 4 meals fits comfortably).
        max_tokens: 12000,
        response_format: { type: "json_object" },
      });

    if (!openaiRes.ok) {
      const fail = await describeOpenAIFailure(openaiRes);
      return new Response(JSON.stringify({ error: fail.message, code: fail.code }), {
        status: fail.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiJson = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = openaiJson.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "OpenAI returned an empty response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJson(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse OpenAI response as JSON.", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateResponse(parsed)) {
      return new Response(
        JSON.stringify({ error: "OpenAI response did not match the expected schema.", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The prompt asks for halal food; this makes sure. Any meal that still isn't
    // halal is replaced once by the AI, and dropped if the replacement isn't either.
    const planOut = parsed as MealPlanResponse;
    const bad = planOut.days.flatMap((d) =>
      d.meals
        .map((m, i) => ({ day: d, index: i, meal: m, why: mealHaramReason(m as unknown as Record<string, unknown>) }))
        .filter((x) => x.why),
    );
    if (bad.length) {
      const replacements = await replaceMeals(apiKey, body, bad.map((b) => ({ type: b.meal.type, name: b.meal.name, why: b.why! })));
      bad.forEach((b, i) => {
        const r = replacements[i];
        b.day.meals[b.index] = r && isMeal(r) && !mealHaramReason(r as unknown as Record<string, unknown>) ? r : (null as unknown as PlannedMeal);
      });
      for (const d of planOut.days) d.meals = d.meals.filter(Boolean);
    }

    const allMeals = planOut.days.flatMap((d) => d.meals);
    await saveToLibrary(allMeals);
    // Same recipes in French and Arabic: the person's language comes back with
    // the plan, the other is saved in the background.
    const translations = await translateForPlan(apiKey, allMeals, requestLang(body.lang));
    await recordUsage(user.id, "ai_meal_plan");

    return new Response(JSON.stringify({ ...planOut, translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
