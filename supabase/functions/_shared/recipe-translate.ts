// AI chef recipes in French and Arabic. English stays the master copy (pantry,
// shopping and allergy checks match on English names); this writes the
// translations into recipe_translations / food_translations — same recipe id,
// same photo, only the words change.
import { fetchOpenAI } from "./openai.ts";

export type Lang = "en" | "fr" | "ar";
export const OTHER_LANGS: Exclude<Lang, "en">[] = ["fr", "ar"];

const MODEL = "gpt-4o-mini";

export interface TranslatableMeal {
  id?: string;
  name: string;
  description: string;
  ingredients: { name: string }[];
  recipe: string[];
}

interface Translated {
  name: string;
  description: string;
  steps: string[];
  ingredients: string[];
}

const LANG_NAME = { fr: "French", ar: "Arabic (Modern Standard, simple everyday words)" } as const;

/** The language the person is using, from the request (defaults to English). */
export function requestLang(value: unknown): Lang {
  return value === "fr" || value === "ar" ? value : "en";
}

async function translateOne(apiKey: string, meal: TranslatableMeal, lang: "fr" | "ar"): Promise<Translated | null> {
  const source = {
    name: meal.name,
    description: meal.description,
    steps: meal.recipe,
    ingredients: meal.ingredients.map((i) => i.name),
  };
  const res = await fetchOpenAI(apiKey, {
    model: MODEL,
    temperature: 0.2,
    max_tokens: 2500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You translate halal family recipes from English into ${LANG_NAME[lang]} for a cooking app. ` +
          "Keep dish names that are known by their own name (tajine, biryani, shawarma…) in their usual form for that language. " +
          "Keep every number, temperature and quantity exactly. Keep the same number of steps and ingredients, in the same order. " +
          'Return JSON {"name": string, "description": string, "steps": string[], "ingredients": string[]}.',
      },
      { role: "user", content: JSON.stringify(source) },
    ],
  });
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const t = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Partial<Translated>;
    const okList = (a: unknown, n: number) => Array.isArray(a) && a.length === n && a.every((s) => typeof s === "string" && s.trim());
    if (typeof t.name !== "string" || !t.name.trim()) return null;
    return {
      name: t.name.trim(),
      description: typeof t.description === "string" ? t.description.trim() : "",
      steps: okList(t.steps, source.steps.length) ? (t.steps as string[]) : [],
      ingredients: okList(t.ingredients, source.ingredients.length) ? (t.ingredients as string[]) : [],
    };
  } catch {
    return null;
  }
}

/** Which of these library recipes already have a translation in this language. */
async function alreadyTranslated(url: string, headers: Record<string, string>, ids: string[], lang: string): Promise<Set<string>> {
  if (!ids.length) return new Set();
  try {
    const res = await fetch(`${url}/rest/v1/recipe_translations?select=recipe_id&lang=eq.${lang}&recipe_id=in.(${ids.join(",")})`, { headers });
    const rows = res.ok ? ((await res.json()) as { recipe_id: string }[]) : [];
    return new Set(rows.map((r) => r.recipe_id));
  } catch {
    return new Set();
  }
}

/**
 * Translates the library meals into one language, saves the result, and returns
 * the English → translated words (for the app to show straight away).
 */
export async function translateMeals(apiKey: string, meals: TranslatableMeal[], lang: "fr" | "ar"): Promise<Record<string, string>> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const words: Record<string, string> = {};
  if (!url || !key) return words;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const isId = (id?: string): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
  // One translation per recipe, even if the plan has it twice.
  const unique = [...new Map(meals.filter((m) => isId(m.id)).map((m) => [m.id!, m])).values()];
  const done = await alreadyTranslated(url, headers, unique.map((m) => m.id!), lang);
  const todo = unique.filter((m) => !done.has(m.id!));
  if (!todo.length) return words;

  const results = await Promise.all(todo.map((m) => translateOne(apiKey, m, lang).catch(() => null)));
  const recipeRows: Record<string, unknown>[] = [];
  const foodRows: { name_en: string; lang: string; name: string }[] = [];
  todo.forEach((m, i) => {
    const t = results[i];
    if (!t) return;
    recipeRows.push({ recipe_id: m.id, lang, name: t.name, short_description: t.description || null, steps: t.steps });
    words[m.name] = t.name;
    if (m.description && t.description) words[m.description] = t.description;
    m.recipe.forEach((s, j) => t.steps[j] && (words[s] = t.steps[j]));
    m.ingredients.forEach((ing, j) => {
      const name = t.ingredients[j];
      if (!name) return;
      words[ing.name] = name;
      const en = ing.name.trim().toLowerCase();
      if (en.length <= 120 && name.length <= 120) foodRows.push({ name_en: en, lang, name });
    });
  });
  try {
    if (recipeRows.length) {
      await fetch(`${url}/rest/v1/rpc/save_recipe_translations`, { method: "POST", headers, body: JSON.stringify({ rows: recipeRows }) });
    }
    if (foodRows.length) {
      // Only names the library doesn't know yet: the reviewed list stays as it is.
      const known = await fetch(
        `${url}/rest/v1/food_translations?select=name_en&lang=eq.${lang}&name_en=in.(${encodeURIComponent(foodRows.map((f) => `"${f.name_en.replace(/"/g, "")}"`).join(","))})`,
        { headers },
      )
        .then((r) => (r.ok ? (r.json() as Promise<{ name_en: string }[]>) : []))
        .catch(() => [] as { name_en: string }[]);
      const have = new Set(known.map((k) => k.name_en));
      const fresh = [...new Map(foodRows.filter((f) => !have.has(f.name_en)).map((f) => [f.name_en, f])).values()];
      if (fresh.length) {
        await fetch(`${url}/rest/v1/rpc/save_food_translations`, { method: "POST", headers, body: JSON.stringify({ rows: fresh }) });
      }
    }
  } catch (e) {
    console.error("Saving translations failed", e);
  }
  return words;
}

/**
 * Translates new AI chef meals into French and Arabic. The person's own
 * language is awaited (so the reply already carries it); the other keeps
 * going after the reply is sent.
 */
export async function translateForPlan(apiKey: string, meals: TranslatableMeal[], lang: Lang): Promise<Record<string, string>> {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  let mine: Promise<Record<string, string>> = Promise.resolve({});
  for (const other of OTHER_LANGS) {
    const task = translateMeals(apiKey, meals, other).catch((e) => {
      console.error(`Translating to ${other} failed`, e);
      return {} as Record<string, string>;
    });
    if (other === lang) mine = task;
    else runtime?.waitUntil(task);
  }
  return await mine;
}
