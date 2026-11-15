import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { conflictsWithAllergies, fitsDiet } from "../_shared/allergens.ts";
import { haramReason } from "../_shared/halal.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { getUser, isAdminUser } from "../_shared/plan.ts";
import { photographRecipes } from "../_shared/recipe-image.ts";
import { translateMeals } from "../_shared/recipe-translate.ts";
import { computeNutrition } from "../_shared/nutrition.ts";

/**
 * Fills the recipe library so every combination of filters a family can pick
 * has at least TARGET recipes, for every meal type and every cuisine.
 *
 * How: a recipe free of every allergen Firdam offers, and vegan and
 * gluten-free, fits ANY mix of allergy and diet filters, except the three
 * that a dish must positively be (high-protein, low-carb, kid-friendly). So for
 * each meal type × cuisine × mix of those three, the library needs TARGET such
 * "free-from-everything" recipes. This function counts what is missing and
 * writes the missing recipes (with nutrition, tags, French and Arabic, and a photo).
 * A new recipe stays hidden (is_active = false) until its photo is made:
 * families never see a recipe without its picture.
 *
 *   POST { action: "status" }        → how many slots still need recipes
 *   POST { action: "fill", limit? }  → writes up to `limit` (1–3) recipes
 *
 * Allowed for Firdam admins, or with header x-lunchbox-token (the Vault secret
 * "lunchbox_admin_token", used by the database job "recipe-fill").
 */

const MODEL = "gpt-4o-mini";
const TARGET = 3;
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
/** Every allergy the filters offer (Milk = dairy, Wheat = gluten). */
const ALL_ALLERGIES = ["Celery", "Eggs", "Fish", "Gluten", "Lupin", "Milk", "Mustard", "Peanuts", "Sesame", "Shellfish", "Soy", "Sulphites", "Tree nuts", "Wheat"];
const FREE_DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Pescatarian"];
const EXTRAS = ["High-protein", "Low-carb", "Kid-friendly"] as const;
/** Things the word matcher can't see for Lupin and Sulphites. */
const HIDDEN = /\b(lupin|lupini|sulphite|sulfite|vinegar|wine|dried apricots?|dried fruit|raisins?|sultanas?|molasses|pickled|pickles?|mustard)\b/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-lunchbox-token",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const env = (n: string) => {
  const v = Deno.env.get(n);
  return v && v.trim() ? v.trim() : undefined;
};

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = env("SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Database ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

interface Row {
  id: string;
  name: string;
  protein: number | null;
  carbs: number | null;
  cuisine: { name: string } | null;
  meal_type: { name: string } | null;
  recipe_ingredients: { ingredient: { name: string } | null }[];
  recipe_allergens: { allergen: { name: string } | null }[];
  recipe_tags: { tag: { name: string } | null }[];
}

const mealKey = (n: string | undefined | null) => {
  const s = (n ?? "").toLowerCase();
  return MEALS.find((m) => s.includes(m)) ?? null;
};

/** Free of every allergy Firdam offers, and vegan + gluten-free. */
function freeFromEverything(ings: string[], tagged: string[], tags: string[]): boolean {
  if (conflictsWithAllergies(ings, ALL_ALLERGIES, tagged)) return false;
  if (ings.some((i) => HIDDEN.test(i))) return false;
  return FREE_DIETS.every((d) => fitsDiet(d, { ingredients: ings, tags }));
}

/** Which of the three "must be" filters a recipe meets (bit 0 high-protein, 1 low-carb, 2 kid-friendly). */
function extrasMask(ings: string[], tags: string[], protein: number | null, carbs: number | null): number {
  return EXTRAS.reduce((m, d, i) => (fitsDiet(d, { ingredients: ings, tags, protein, carbs }) ? m | (1 << i) : m), 0);
}

interface Slot {
  meal: (typeof MEALS)[number];
  cuisine: string;
  extras: number;
  have: number;
}

/** Every meal × cuisine × mix of extras with fewer than TARGET fitting recipes, hardest first. */
async function findGaps(): Promise<{ gaps: Slot[]; cuisines: string[] }> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest<Row[]>(
      `recipes?select=id,name,protein,carbs,cuisine:cuisines(name),meal_type:meal_types(name),recipe_ingredients(ingredient:ingredients(name)),recipe_allergens(allergen:allergens(name)),recipe_tags(tag:tags(name))&or=(is_active.eq.true,source.eq.ai-fill)&order=id`,
      { headers: { Range: `${from}-${from + 999}` } },
    );
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const cuisines = Array.from(new Set(rows.map((r) => r.cuisine?.name).filter((c): c is string => !!c))).sort();
  // count[meal|cuisine|extras-mask-of-recipe]
  const free: Map<string, number[]> = new Map();
  for (const r of rows) {
    const meal = mealKey(r.meal_type?.name);
    const cuisine = r.cuisine?.name;
    if (!meal || !cuisine) continue;
    const ings = r.recipe_ingredients.map((x) => x.ingredient?.name ?? "").filter(Boolean);
    if (!ings.length) continue;
    const tagged = r.recipe_allergens.map((x) => x.allergen?.name ?? "").filter(Boolean);
    const tags = r.recipe_tags.map((x) => x.tag?.name ?? "").filter(Boolean);
    if (!freeFromEverything(ings, tagged, tags)) continue;
    const k = `${meal}|${cuisine}`;
    (free.get(k) ?? free.set(k, []).get(k)!).push(extrasMask(ings, tags, r.protein, r.carbs));
  }
  const skipped = new Set((await rest<{ key: string }[]>("recipe_fill_skips?select=key&tries=gte.3")).map((s) => s.key));
  const gaps: Slot[] = [];
  for (const meal of MEALS) {
    for (const cuisine of cuisines) {
      const masks = free.get(`${meal}|${cuisine}`) ?? [];
      for (let want = 0; want < 8; want++) {
        const have = masks.filter((m) => (m & want) === want).length;
        if (have < TARGET && !skipped.has(`${meal}|${cuisine}|${want}`)) gaps.push({ meal, cuisine, extras: want, have });
      }
    }
  }
  // Most extras first: one high-protein + low-carb + kid-friendly recipe also fills the easier mixes.
  // Combinations most families pick first; high-protein (often impossible for this food) last.
  gaps.sort((a, b) => (a.extras & 1) - (b.extras & 1) || bits(b.extras) - bits(a.extras) || a.have - b.have);
  return { gaps, cuisines };
}
const bits = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

interface Written {
  /** Every ingredient (but salt-like extras) came with its weight. */
  weighed: boolean;
  name: string;
  description: string;
  type: string;
  cuisine: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  protein: number;
  carbs: number;
  calories: number;
  kidFriendly: boolean;
  ingredients: { name: string; quantity: string; unit: string }[];
  recipe: string[];
}

async function writeRecipe(slot: Slot, avoidNames: string[], problem: string | null): Promise<Written> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) throw new Error("AI is not set up.");
  const wants = [
    slot.extras & 1 ? "high in protein: at least 25 g protein per serving (beans, lentils, chickpeas, quinoa, hemp or pumpkin seeds; NO soy, NO nuts)" : null,
    slot.extras & 2 ? "low-carb: at most 25 g carbohydrates per serving" : null,
    slot.extras & 4 ? "kid-friendly: mild, familiar, not spicy, easy for children to eat" : null,
  ].filter(Boolean);
  const res = await fetchOpenAI(apiKey, {
    model: MODEL,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You write authentic, practical home recipes for Muslim families. Every rule below is a hard rule:",
          "- Halal. Vegan: no meat, poultry, fish, seafood, eggs, milk, butter, ghee, cheese, yoghurt, cream or honey.",
          "- NO gluten: no wheat, flour, bread, pasta, couscous, bulgur, freekeh, semolina, barley, rye, spelt, soy sauce. Use rice, corn, potatoes, quinoa, buckwheat, millet, gluten-free oats, rice paper, corn tortillas.",
          "- NO peanuts, NO tree nuts (almonds, cashews, pistachios, walnuts, coconut is fine), NO sesame or tahini, NO soy (tofu, tempeh, edamame, miso), NO mustard, NO celery, NO lupin.",
          "- NO sulphites: no vinegar, wine, dried apricots, raisins or other dried fruit, pickles or molasses. Use lemon or lime juice for sourness.",
          "- No alcohol, no vanilla extract (vanilla powder is fine).",
          "- Name every ingredient plainly (e.g. 'red lentils', 'olive oil'). Quantities for the servings given.",
          "- Honest nutrition per serving, as a nutritionist would calculate it from the quantities. Never adjust the numbers to meet a target: if the dish cannot meet it, give the real numbers.",
        ].join("\n"),
      },
      {
        role: "user",
        content:
          `Write one real, traditional ${slot.cuisine} ${slot.meal} dish that people in that cuisine actually cook (naturally vegan, or a faithful vegan version of a classic), called by its real name, with an English description in brackets if the name is not English. Its name must not mention meat, fish, eggs, dairy or anything it does not contain. No invented \"bowls\". Use quinoa only if it is traditional in ${slot.cuisine} cooking.` +
          (wants.length ? ` It must be ${wants.join("; ")}.` : "") +
          ` Do not repeat: ${avoidNames.slice(0, 40).join("; ")}.` +
          (problem ? ` The last try was rejected because it ${problem}. Fix that.` : "") +
          ` Answer as JSON: {"name":"","description":"one sentence","difficulty":"Easy|Medium","prepTime":minutes,"cookTime":minutes,"servings":4,` +
          `"protein":grams per serving,"carbs":grams per serving,"calories":per serving,"kidFriendly":true|false,` +
          `"ingredients":[{"name":"","quantity":"","unit":"","grams":weight in grams of this quantity}],"recipe":["step", "..."]}`,
      },
    ],
  });
  if (!res.ok) throw new Error((await describeOpenAIFailure(res)).message);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const o = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const rawIngredients = (Array.isArray(o.ingredients) ? o.ingredients : []).map((x) => x as Record<string, unknown>);
  const servings = Math.max(1, Math.round(num(o.servings, 4)));
  // Nutrition is worked out from the ingredient weights, never taken from the AI.
  const facts = computeNutrition(rawIngredients.map((x) => ({ name: String(x.name ?? ""), grams: num(x.grams) })), servings);
  const weighed = rawIngredients.filter((x) => num(x.grams) > 0).length;
  return {
    weighed: rawIngredients.length > 0 && weighed >= rawIngredients.length - 2,
    name: String(o.name ?? "").trim().slice(0, 120),
    description: String(o.description ?? "").trim().slice(0, 300),
    type: slot.meal[0].toUpperCase() + slot.meal.slice(1),
    cuisine: slot.cuisine,
    difficulty: String(o.difficulty ?? "Easy"),
    prepTime: Math.round(num(o.prepTime, 10)),
    cookTime: Math.round(num(o.cookTime, 20)),
    servings,
    protein: facts.protein,
    carbs: facts.carbs,
    calories: facts.calories,
    kidFriendly: o.kidFriendly === true,
    ingredients: rawIngredients
      .map((x) => ({ name: String(x.name ?? "").trim().slice(0, 80), quantity: String(x.quantity ?? "").trim().slice(0, 20), unit: String(x.unit ?? "").trim().slice(0, 20) }))
      .filter((x) => x.name)
      .slice(0, 25),
    recipe: (Array.isArray(o.recipe) ? o.recipe : []).map((s) => String(s).trim().slice(0, 600)).filter(Boolean).slice(0, 15),
  };
}

/** Why a written recipe doesn't fill the slot, or null when it does. */
function problemWith(w: Written, slot: Slot): string | null {
  if (w.name.length < 3 || w.ingredients.length < 3 || w.recipe.length < 2) return "was incomplete";
  const ings = w.ingredients.map((i) => i.name);
  const halal = haramReason(ings, w.recipe);
  if (halal) return `was not halal (${halal})`;
  const tags = w.kidFriendly ? ["kid-friendly"] : [];
  if (!freeFromEverything(ings, [], tags)) return "contained an allergen, gluten or an animal product";
  // Numbers must be believable: plant food free of soy, nuts and gluten always
  // has at least as many carbs as protein, and the calories must cover both.
  // The name must not promise a food the recipe doesn't contain (an allergy or a vegan diet relies on it).
  const named = detectAllergens([w.name]);
  if (named.size || hasMeat([w.name]) || hasSeafood([w.name]) || /\b(huevos|labneh|mas huni|tuna|keema|shrimp|prawn|chingri)\b/i.test(w.name))
    return "was named after a food it does not contain (meat, fish, eggs or dairy); choose a dish that is vegan by tradition and name it truthfully";
  if (!w.weighed) return "did not give the weight in grams of every ingredient";
  if (!(w.calories > 0)) return "had no nutrition numbers";
  if (/\b(bowl|medley|delight|power|protein[- ]packed|hash)\b/i.test(w.name)) return "had an invented-sounding name (bowl, medley, delight…); write a real traditional dish and use its real name";
  const mask = extrasMask(ings, tags, w.protein, w.carbs);
  if ((mask & slot.extras) !== slot.extras) {
    const missing = EXTRAS.filter((_, i) => slot.extras & (1 << i) && !(mask & (1 << i)));
    return `was not ${missing.join(" and ").toLowerCase()}: weighed out, its ingredients give ${w.protein} g protein and ${w.carbs} g carbs per serving. Use larger amounts of lentils, beans, chickpeas or pumpkin seeds, or fewer servings`;
  }
  return null;
}

async function tagIds(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const found = await rest<{ id: string }[]>(`tags?select=id&name=ilike.${encodeURIComponent(name)}&limit=1`);
    if (found[0]) ids.push(found[0].id);
    else ids.push((await rest<{ id: string }[]>("tags", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name }) }))[0].id);
  }
  return ids;
}

async function save(w: Written): Promise<string | null> {
  const before = await rest<{ id: string }[]>(`recipes?select=id&name=ilike.${encodeURIComponent(w.name)}&limit=1`);
  if (before.length) return null; // same name already in the library
  const id = await rest<string | null>("rpc/save_ai_recipe", { method: "POST", body: JSON.stringify({ meal: w }) });
  if (!id) return null;
  await rest(`recipes?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    // Hidden until its photo is made (see showPhotographed).
    body: JSON.stringify({ protein: w.protein, carbs: w.carbs, calories: w.calories, source: "ai-fill", is_active: false }),
  });
  const tags = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut-free", ...(w.kidFriendly ? ["Kid-friendly"] : []), ...(w.protein >= 25 ? ["High-protein"] : []), ...(w.carbs <= 25 ? ["Low-carb"] : [])];
  const ids = await tagIds(tags);
  await rest("recipe_tags?on_conflict=recipe_id,tag_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(ids.map((tag_id) => ({ recipe_id: id, tag_id }))),
  });
  return id;
}

/** Makes photos for filler recipes still waiting for one, then shows the ones that have it. */
async function photographAndShow(newIds: string[], budgetMs: number) {
  const waiting = await rest<{ id: string }[]>("recipes?select=id&source=in.(ai-fill,ai-cuisine)&is_active=eq.false&image_path=is.null&order=created_at&limit=6");
  const ids = Array.from(new Set([...newIds, ...waiting.map((w) => w.id)]));
  if (ids.length) await photographRecipes(ids, budgetMs);
  await rest("recipes?source=in.(ai-fill,ai-cuisine)&is_active=eq.false&image_path=not.is.null", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_active: true }),
  });
}

async function skip(slot: Slot, error: string) {
  const key = slot.extras < 0 ? `${slot.cuisine}|${slot.meal}` : `${slot.meal}|${slot.cuisine}|${slot.extras}`;
  const prev = await rest<{ tries: number }[]>(`recipe_fill_skips?select=tries&key=eq.${encodeURIComponent(key)}`);
  await rest("recipe_fill_skips?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    // Two honest, weighed-out tries that fell short of a protein or carb target: the food can't reach it.
    body: JSON.stringify({ key, tries: /^was not (high-protein|low-carb)/.test(error) ? 3 : (prev[0]?.tries ?? 0) + 1, last_error: error.slice(0, 300), updated_at: new Date().toISOString() }),
  });
}


// ── Traditional dishes by cuisine ──
// Every cuisine needs PER_MEAL real, traditional halal dishes for each meal
// (normal family food: halal meat, dairy, bread…), with nutrition worked out
// from ingredient weights like the rest of the library.
const PER_MEAL = 3;
type Meal = (typeof MEALS)[number];
interface CuisineSlot { cuisine: string; meal: Meal; have: number; names: string[] }

async function cuisineGaps(): Promise<CuisineSlot[]> {
  const cuisines = await rest<{ id: string; name: string }[]>("cuisines?select=id,name&active=not.is.false&name=neq.International");
  const rows: { name: string; cuisine_id: string | null; meal_type: { name: string } | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest<typeof rows>(
      "recipes?select=name,cuisine_id,meal_type:meal_types(name)&or=(is_active.eq.true,and(source.eq.ai-cuisine,image_path.is.null))&order=id",
      { headers: { Range: `${from}-${from + 999}` } },
    );
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const skipped = new Set((await rest<{ key: string }[]>("recipe_fill_skips?select=key&tries=gte.3&key=like.cuisine*")).map((s) => s.key));
  const gaps: CuisineSlot[] = [];
  for (const c of cuisines) {
    for (const meal of MEALS) {
      const names = rows.filter((r) => r.cuisine_id === c.id && mealKey(r.meal_type?.name) === meal).map((r) => r.name);
      if (names.length < PER_MEAL && !skipped.has(`cuisine|${c.name}|${meal}`)) gaps.push({ cuisine: c.name, meal, have: names.length, names });
    }
  }
  return gaps.sort((a, b) => a.have - b.have);
}

async function writeCuisineRecipe(slot: CuisineSlot, problem: string | null): Promise<Written> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) throw new Error("AI is not set up.");
  const res = await fetchOpenAI(apiKey, {
    model: MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You write authentic, practical home recipes for Muslim families. Every rule below is a hard rule:",
          "- Strictly halal: no pork or pork products, no alcohol in any form (no wine, mirin, beer, vanilla extract; vanilla powder is fine), no blood.",
          "- Write 'halal' before meat, poultry, sausages, gelatin and stock (e.g. 'halal lamb shoulder', 'halal chicken stock').",
          "- Name every ingredient plainly so its allergens are obvious ('wheat flour', 'pine nuts', 'plain yogurt'); no ready-made mixes or sauces that hide them.",
          "- Give the weight in grams of every ingredient for the servings stated.",
          "- The name is the dish's real name written in Latin letters, followed by a short English description in brackets, e.g. 'Fahsa (Yemeni lamb stew)'. Never only in another alphabet.",
      "- Every quantity is a number ('2', '0.5'); for frying oil give the amount you pour in.",
        ].join("\n"),
      },
      {
        role: "user",
        content:
          `Write one real, traditional ${slot.cuisine} ${slot.meal} dish that families in that cuisine actually cook at home.` +
          (slot.names.length ? ` The library already has: ${slot.names.join("; ")}. Write a different dish.` : "") +
          (problem ? ` The last try was rejected because it ${problem}. Fix that.` : "") +
          ` Answer as JSON: {"name":"","description":"one sentence","difficulty":"Easy|Medium","prepTime":minutes,"cookTime":minutes,"servings":4,` +
          `"kidFriendly":true|false,"ingredients":[{"name":"","quantity":"","unit":"","grams":weight in grams of this quantity}],"recipe":["step","..."]}`,
      },
    ],
  });
  if (!res.ok) throw new Error((await describeOpenAIFailure(res)).message);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const o = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const raw = (Array.isArray(o.ingredients) ? o.ingredients : []).map((x) => x as Record<string, unknown>);
  const servings = Math.max(1, Math.round(num(o.servings, 4)));
  const facts = computeNutrition(raw.map((x) => ({ name: String(x.name ?? ""), grams: num(x.grams) })), servings);
  const weighed = raw.filter((x) => num(x.grams) > 0).length;
  return {
    weighed: raw.length > 0 && weighed >= raw.length - 2,
    name: String(o.name ?? "").trim().slice(0, 120),
    description: String(o.description ?? "").trim().slice(0, 300),
    type: slot.meal[0].toUpperCase() + slot.meal.slice(1),
    cuisine: slot.cuisine,
    difficulty: String(o.difficulty ?? "Easy"),
    prepTime: Math.round(num(o.prepTime, 10)),
    cookTime: Math.round(num(o.cookTime, 20)),
    servings,
    protein: facts.protein,
    carbs: facts.carbs,
    calories: facts.calories,
    kidFriendly: o.kidFriendly === true,
    ingredients: raw
      .map((x) => { const q = Number(String(x.quantity ?? "").replace(",", ".")); const numeric = String(x.quantity ?? "").trim() !== "" && Number.isFinite(q) && q > 0; const g = num(x.grams); return { name: String(x.name ?? "").trim().slice(0, 80), quantity: numeric ? String(x.quantity).trim().slice(0, 20) : g > 0 ? String(Math.round(g)) : "", unit: numeric ? String(x.unit ?? "").trim().replace(/^-$/, "").slice(0, 20) : g > 0 ? "g" : "", grams: g }; })
      .filter((x) => x.name)
      .slice(0, 25),
    recipe: (Array.isArray(o.recipe) ? o.recipe : []).map((s) => String(s).trim().slice(0, 600)).filter(Boolean).slice(0, 15),
  };
}

function cuisineProblem(w: Written): string | null {
  if (w.name.length < 3 || w.ingredients.length < 4 || w.recipe.length < 3) return "was incomplete";
  if (!/^[A-Za-z]/.test(w.name)) return "had a name that does not start in Latin letters";
  if (!/\(.+\)\s*$/.test(w.name)) w.name = `${w.name} (${w.cuisine} ${w.type.toLowerCase()})`.slice(0, 120);
  const halal = haramReason(w.ingredients.map((i) => i.name), w.recipe);
  if (halal) return `was not halal (${halal})`;
  if (!w.weighed) return "did not give the weight in grams of every ingredient";
  const main = w.ingredients.filter((i) => ((i as { grams?: number }).grams ?? 0) >= 20).length;
  if (main < 3) return "was too simple (fewer than 3 main ingredients); write a real dish";
  if (!(w.calories > 0)) return "had no nutrition numbers";
  return null;
}

async function saveCuisine(w: Written): Promise<string | null> {
  const before = await rest<{ id: string }[]>(`recipes?select=id&name=ilike.${encodeURIComponent(w.name)}&limit=1`);
  if (before.length) return null;
  const id = await rest<string | null>("rpc/save_ai_recipe", { method: "POST", body: JSON.stringify({ meal: w }) });
  if (!id) return null;
  await rest(`recipes?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ protein: w.protein, carbs: w.carbs, calories: w.calories, source: "ai-cuisine", is_active: false }),
  });
  const tags = [...(w.kidFriendly ? ["Kid-friendly"] : []), ...(w.protein >= 25 ? ["High-protein"] : []), ...(w.carbs <= 25 ? ["Low-carb"] : [])];
  if (tags.length) {
    const ids = await tagIds(tags);
    await rest("recipe_tags?on_conflict=recipe_id,tag_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(ids.map((tag_id) => ({ recipe_id: id, tag_id }))) });
  }
  return id;
}

async function fillCuisines(limit: number): Promise<{ made: string[]; ids: string[]; remaining: number }> {
  const gaps = await cuisineGaps();
  const apiKey = env("OPENAI_API_KEY")!;
  const made: string[] = [], ids: string[] = [];
  const stopAt = Date.now() + 70_000;
  for (const slot of gaps.slice(0, limit)) {
    if (Date.now() > stopAt) break;
    let problem: string | null = null, saved: string | null = null;
    for (let attempt = 0; attempt < 2 && !saved; attempt++) {
      try {
        const w = await writeCuisineRecipe(slot, problem);
        problem = cuisineProblem(w);
        if (problem) continue;
        saved = await saveCuisine(w);
        if (!saved) problem = "had a name already in the library";
        else {
          made.push(`${w.name} (${slot.cuisine} ${slot.meal})`);
          ids.push(saved);
          for (const lang of ["fr", "ar"] as const) {
            await translateMeals(apiKey, [{ id: saved, name: w.name, description: w.description, ingredients: w.ingredients, recipe: w.recipe }], lang).catch((e) => console.error("translate", e));
          }
        }
      } catch (e) { problem = (e as Error).message; console.error("recipe-fill cuisine", slot.cuisine, slot.meal, problem); }
    }
    if (!saved) await skip({ meal: slot.meal, cuisine: `cuisine|${slot.cuisine}`, extras: -1, have: slot.have }, problem ?? "unknown");
  }
  if (ids.length) await rest("rpc/retag_recipe_allergens", { method: "POST", body: "{}" }).catch(() => null);
  return { made, ids, remaining: Math.max(0, gaps.length - made.length) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const token = req.headers.get("x-lunchbox-token");
    const allowed = token
      ? (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: token }) })) === true
      : await (async () => {
          const user = await getUser(req);
          return !!user && (await isAdminUser(user.id));
        })();
    if (!allowed) return json({ error: "Admins only." }, 403);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === "cuisine" || body.action === "cuisine-status") {
      if (body.action === "cuisine-status") return json({ remaining: (await cuisineGaps()).length });
      const r = await fillCuisines(Math.min(3, Math.max(1, Number(body.limit) || 1)));
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil?.(photographAndShow(r.ids, 120_000).catch((e) => console.error("photos", e)));
      return json({ made: r.made, remaining: r.remaining });
    }
    const { gaps, cuisines } = await findGaps();
    if (body.action !== "fill") {
      return json({ remaining: gaps.length, cuisines: cuisines.length, sample: gaps.slice(0, 12).map((g) => `${g.cuisine} ${g.meal} [${EXTRAS.filter((_, i) => g.extras & (1 << i)).join(", ") || "any"}] has ${g.have}`) });
    }

    const limit = Math.min(3, Math.max(1, Number(body.limit) || 1));
    const apiKey = env("OPENAI_API_KEY")!;
    const made: string[] = [];
    const ids: string[] = [];
    const stopAt = Date.now() + 70_000;
    for (const slot of gaps.slice(0, limit)) {
      if (Date.now() > stopAt) break;
      const avoid = await rest<{ name: string }[]>(`recipes?select=name&cuisine_id=not.is.null&source=eq.ai-fill&order=created_at.desc&limit=40`).then((r) => r.map((x) => x.name)).catch(() => []);
      let problem: string | null = null;
      let saved: string | null = null;
      for (let attempt = 0; attempt < 2 && !saved; attempt++) {
        try {
          const w = await writeRecipe(slot, avoid, problem);
          problem = problemWith(w, slot);
          if (problem) continue;
          saved = await save(w);
          if (!saved) problem = "had a name already in the library";
          else {
            made.push(`${w.name} (${slot.cuisine} ${slot.meal})`);
            ids.push(saved);
            for (const lang of ["fr", "ar"] as const) {
              await translateMeals(apiKey, [{ id: saved, name: w.name, description: w.description, ingredients: w.ingredients, recipe: w.recipe }], lang).catch((e) => console.error("translate", e));
            }
          }
        } catch (e) {
          problem = (e as Error).message;
          console.error("recipe-fill", slot, problem);
        }
      }
      if (!saved) await skip(slot, problem ?? "unknown");
    }
    // Photos after the response, so the database job isn't kept waiting.
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(photographAndShow(ids, 120_000).catch((e) => console.error("photos", e)));
    return json({ made, remaining: Math.max(0, gaps.length - made.length) });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
