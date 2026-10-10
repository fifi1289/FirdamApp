import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { haramReason } from "../_shared/halal.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { getUser, isAdminUser } from "../_shared/plan.ts";

/**
 * Admin tool: writes the ingredients and method for recipes that have a name,
 * description, cuisine, servings and times but nothing to cook from yet.
 * Every result passes the same halal check as the recipe library.
 *
 *   GET  → { remaining }
 *   POST { limit?: 1–8, skip?: string[] } → { done, failed, remaining }
 *
 * The admin page calls POST repeatedly; a few recipes per call keeps each
 * call well inside the edge-function time limit.
 *
 * Secrets: OPENAI_API_KEY. Optional: RECIPE_MODEL (default gpt-4o-mini).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = env("SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface MissingRecipe {
  id: string;
  name: string;
  short_description: string | null;
  cuisine: string | null;
  meal_type: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  calories: number | null;
}

interface Written {
  ingredients: { name: string; quantity: number | null; unit: string; optional?: boolean; notes?: string | null }[];
  steps: { instruction: string; minutes?: number | null }[];
}

const UNITS: Record<string, string> = {
  g: "g", gram: "g", grams: "g", kg: "kg", ml: "ml", l: "l", litre: "l", liter: "l", litres: "l", liters: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp", tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup", piece: "pieces", pieces: "pieces", pcs: "pieces", whole: "pieces",
  clove: "cloves", cloves: "cloves", pinch: "pinch", handful: "handful", bunch: "bunch", "to taste": "to taste", "": "to taste",
};

const SYSTEM = [
  "You are a careful home-cooking recipe writer for Firdam, an app for Muslim families.",
  "Write the ingredients and method for the recipe described. Follow the name and description closely.",
  "Strictly halal: no pork or pork products, no alcohol in any form (no wine, mirin, beer, vanilla extract — use vanilla powder),",
  "no blood. Say 'halal' before meat, poultry, sausages, gelatin and stock cubes (e.g. 'halal beef mince', 'halal chicken stock cube').",
  "Ingredients: 5 to 15 items, amounts for the stated servings, metric. Units only from: g, kg, ml, l, tsp, tbsp, cup, pieces, cloves, pinch, handful, bunch, to taste.",
  "Ingredient names: lower case, plain and shoppable ('basmati rice', 'red onion', 'ground cumin'); preparation goes in notes ('finely chopped').",
  "Use 'to taste' with quantity null only for salt, pepper and similar seasonings.",
  "Method: 4 to 9 clear steps in plain English, each one or two sentences, with times and heat where useful.",
  "Total time should roughly match the prep and cook minutes given.",
  'Reply with JSON only: {"ingredients":[{"name":"","quantity":0,"unit":"","optional":false,"notes":""}],"steps":[{"instruction":"","minutes":0}]}',
].join(" ");

function describe(r: MissingRecipe): string {
  return [
    `Recipe: ${r.name}`,
    r.short_description ? `Description: ${r.short_description}` : "",
    r.cuisine ? `Cuisine: ${r.cuisine}` : "",
    r.meal_type ? `Meal: ${r.meal_type}` : "",
    `Servings: ${r.servings ?? 4}`,
    r.prep_time_minutes != null ? `Prep: ${r.prep_time_minutes} min` : "",
    r.cook_time_minutes != null ? `Cook: ${r.cook_time_minutes} min` : "",
    r.calories != null ? `About ${r.calories} kcal per serving` : "",
  ].filter(Boolean).join("\n");
}

function clean(raw: unknown): Written | string {
  const w = raw as Partial<Written> | null;
  if (!w || !Array.isArray(w.ingredients) || !Array.isArray(w.steps)) return "the reply was not a recipe";
  const ingredients = w.ingredients
    .map((i) => {
      const unit = UNITS[String(i?.unit ?? "").trim().toLowerCase()] ?? "pieces";
      const q = Number(i?.quantity);
      return {
        name: String(i?.name ?? "").trim().toLowerCase().replace(/\s+/g, " "),
        quantity: unit === "to taste" || !Number.isFinite(q) || q <= 0 ? null : Math.round(q * 100) / 100,
        unit,
        optional: !!i?.optional,
        notes: i?.notes ? String(i.notes).trim().slice(0, 120) : null,
      };
    })
    .filter((i) => i.name && i.name.length <= 80);
  const steps = w.steps
    .map((s) => ({ instruction: String(s?.instruction ?? "").trim(), minutes: Number.isFinite(Number(s?.minutes)) && Number(s?.minutes) > 0 ? Math.round(Number(s?.minutes)) : null }))
    .filter((s) => s.instruction.length >= 10);
  if (ingredients.length < 3) return "too few ingredients";
  if (steps.length < 3) return "too few steps";
  return { ingredients: ingredients.slice(0, 18), steps: steps.slice(0, 12) };
}

async function write(r: MissingRecipe, apiKey: string, model: string, note?: string): Promise<Written | string> {
  const res = await fetchOpenAI(apiKey, {
    model,
    temperature: 0.4,
    max_tokens: 1600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: describe(r) + (note ? `\n\nImportant: ${note}` : "") },
    ],
  });
  if (!res.ok) {
    const f = await describeOpenAIFailure(res);
    throw Object.assign(new Error(f.message), { status: f.status });
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  try {
    return clean(JSON.parse(text));
  } catch {
    return "the reply was not valid JSON";
  }
}

async function complete(r: MissingRecipe, apiKey: string, model: string): Promise<{ ok: true; ingredients: number; steps: number } | { ok: false; reason: string }> {
  let result = await write(r, apiKey, model);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof result === "string") {
      result = await write(r, apiKey, model, `Your last answer had a problem: ${result}. Follow the format exactly.`);
      continue;
    }
    const reason = haramReason(result.ingredients.map((i) => i.name), result.steps.map((s) => s.instruction));
    if (!reason) break;
    result = await write(r, apiKey, model, `Your last answer was not halal: ${reason}. Use a halal alternative.`);
  }
  if (typeof result === "string") return { ok: false, reason: result };
  const stillHaram = haramReason(result.ingredients.map((i) => i.name), result.steps.map((s) => s.instruction));
  if (stillHaram) return { ok: false, reason: `not halal: ${stillHaram}` };

  const added = await rpc<number>("complete_recipe", { target: r.id, items: result.ingredients, steps: result.steps });
  return { ok: true, ingredients: added, steps: result.steps.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user || !(await isAdminUser(user.id))) return json({ error: "Only Firdam admins can use this tool." }, 403);

    if (req.method === "GET") {
      return json({ remaining: await rpc<number>("count_recipes_missing_ingredients", {}) });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const apiKey = env("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not set in Supabase → Edge Functions → Secrets." }, 501);
    const model = env("RECIPE_MODEL") ?? "gpt-4o-mini";

    const body = (await req.json().catch(() => ({}))) as { limit?: number; skip?: string[] };
    const limit = Math.min(8, Math.max(1, Number(body.limit) || 4));
    const skip = Array.isArray(body.skip) ? body.skip.filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 500) : [];
    const batch = await rpc<MissingRecipe[]>("recipes_missing_ingredients", { max_rows: limit, skip_ids: skip });

    const results = await Promise.all(
      batch.map(async (r) => {
        try {
          return { id: r.id, name: r.name, ...(await complete(r, apiKey, model)) };
        } catch (e) {
          const status = (e as { status?: number }).status;
          // Out of OpenAI credit or a bad key: stop the whole run, not just this recipe.
          if (status === 402 || status === 401 || status === 503) throw e;
          return { id: r.id, name: r.name, ok: false as const, reason: e instanceof Error ? e.message : "unknown error" };
        }
      })
    );

    return json({
      done: results.filter((r) => r.ok),
      failed: results.filter((r) => !r.ok),
      remaining: await rpc<number>("count_recipes_missing_ingredients", {}),
    });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return json({ error: e instanceof Error ? e.message : "Something went wrong" }, status);
  }
});
