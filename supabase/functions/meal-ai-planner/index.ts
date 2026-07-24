import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

interface PlannerRecipe {
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

interface PlannerRequest {
  recipes: PlannerRecipe[];
  planningDuration: number;
  mealTypes: string[];
  householdSize: number;
  weekStartDate: string;
  usePantryFirst: boolean;
  pantryItems?: { name: string; quantity: number; unit: string }[];
  cuisinePreferences?: Record<string, string[]>;
  dietaryPreferences?: string[];
  allergies?: string[];
}

interface PlannedMeal {
  recipeName: string;
  type: string;
}

interface PlannedDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: PlannedMeal[];
}

interface PlannerResponse {
  days: PlannedDay[];
}

const SYSTEM_PROMPT = `You are a meal-planning assistant for a Muslim family app.
You receive a curated list of halal recipes that have already been filtered for the user's cuisine, dietary, allergy, and pantry constraints.
Your job is to select and arrange recipes from ONLY that list into a balanced weekly meal plan.

Rules:
1. Use ONLY recipes from the provided list. Never invent or reference a recipe that is not in the list.
2. Maximize variety — avoid repeating the same recipe within the plan unless the list is too small to avoid it.
3. Each day must contain exactly the meal types requested, in the order given.
4. When pantry usage is prioritized, prefer recipes whose ingredients overlap with the pantry list.
5. Spread cuisines naturally across the week when multiple cuisines are available.
6. Return ONLY valid JSON matching the requested schema. No markdown, no commentary.`;

function buildUserPrompt(req: PlannerRequest): string {
  const recipeList = req.recipes
    .map((r, i) => {
      const ings = r.ingredients
        .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`)
        .join(", ");
      return `${i + 1}. ${r.name} [cuisine: ${r.cuisine}, type: ${r.type}, dietary: ${r.dietaryTags.join("/")}, allergies: ${r.allergyTags.join("/")}, ingredients: ${ings}]`;
    })
    .join("\n");

  const pantry = req.usePantryFirst && req.pantryItems?.length
    ? `\nPantry available (prioritize recipes using these): ${req.pantryItems
        .map((p) => `${p.quantity} ${p.unit} ${p.name}`)
        .join(", ")}.`
    : "";

  const cuisines = req.cuisinePreferences
    ? Object.entries(req.cuisinePreferences)
        .filter(([, list]) => list.length > 0)
        .map(([type, list]) => `${type}: ${list.join(", ")}`)
        .join("; ")
    : "";

  return `Plan ${req.planningDuration} days of meals.
Meal types per day (in this order): ${req.mealTypes.join(", ")}.
Household size: ${req.householdSize} servings.
Week start date: ${req.weekStartDate}.
${cuisines ? `Cuisine preferences by meal type: ${cuisines}.` : ""}
${req.dietaryPreferences?.length ? `Dietary: ${req.dietaryPreferences.join(", ")}.` : ""}
${req.allergies?.length ? `Allergies to avoid: ${req.allergies.join(", ")}.` : ""}
${pantry}

Available recipes (use ONLY these):
${recipeList}

Return JSON with this exact shape:
{
  "days": [
    {
      "dayIndex": 0,
      "dayName": "Monday",
      "date": "YYYY-MM-DD",
      "meals": [
        { "recipeName": "exact recipe name from the list", "type": "breakfast" }
      ]
    }
  ]
}
Day names cycle: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Each day's meals array must have one entry per requested meal type, in the order given.`;
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

function validateResponse(data: unknown): data is PlannerResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.days)) return false;
  return obj.days.every(
    (day) =>
      typeof day === "object" &&
      day !== null &&
      Array.isArray((day as Record<string, unknown>).meals)
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

    const body = (await req.json()) as PlannerRequest;

    if (!body.recipes || !Array.isArray(body.recipes) || body.recipes.length === 0) {
      return new Response(
        JSON.stringify({ error: "A non-empty recipes array is required." }),
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

    return new Response(JSON.stringify(parsed as PlannerResponse), {
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
