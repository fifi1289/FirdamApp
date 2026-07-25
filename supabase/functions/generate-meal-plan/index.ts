import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
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
  pantryItems?: { name: string; quantity: number; unit: string }[];
}

const SYSTEM_PROMPT = `You are a meal-planning assistant for a Muslim family app.
Generate a complete halal weekly meal plan directly from the user's preferences.

Rules:
1. Every recipe MUST be strictly halal — no pork, no alcohol, no non-halal meat. All meat is assumed halal.
2. Respect all dietary preferences and avoid every listed allergy across ingredients and recipe steps.
3. Honor cuisine preferences per meal type when provided; leave a meal type unconstrained when its list is empty.
4. Each day must contain exactly the requested meal types, in the order given.
5. Maximize variety — avoid repeating the same recipe within the plan.
6. When pantry usage is prioritized, prefer recipes that reuse the listed pantry ingredients.
7. Scale ingredient quantities to the household size.
8. Keep recipes realistic and home-cookable with clear step-by-step instructions.
9. Return ONLY valid JSON matching the requested schema. No markdown, no commentary.`;

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
          .map((p) => `${p.quantity} ${p.unit} ${p.name}`)
          .join(", ")}.`
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

    const body = (await req.json()) as GenerateRequest;

    const planningDuration = body.planningDuration ?? 7;
    if (
      typeof planningDuration !== "number" ||
      planningDuration < 1 ||
      planningDuration > 14
    ) {
      return new Response(
        JSON.stringify({ error: "planningDuration must be a number between 1 and 14." }),
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

    const openaiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(
        JSON.stringify({
          error: `OpenAI request failed (${openaiRes.status}).`,
          details: errText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify(parsed as MealPlanResponse), {
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
