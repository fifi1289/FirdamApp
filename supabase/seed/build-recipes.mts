/**
 * Builds the recipe library seed migration from the JSON files in
 * supabase/seed/recipes/ (one file per batch).
 *
 *   node --experimental-strip-types supabase/seed/build-recipes.mts          # check + write
 *   node --experimental-strip-types supabase/seed/build-recipes.mts --check  # check only
 *
 * Every recipe is checked for halal ingredients, format and units. Allergens
 * and diet tags are worked out from the ingredients (lib/recipes/allergens.ts)
 * and merged with any allergens listed in the file.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLERGEN_RULES, detectAllergens, fitsDiet, ruleForAllergy } from '../../lib/recipes/allergens.ts';

const here = dirname(fileURLToPath(import.meta.url));
const RECIPE_DIR = join(here, 'recipes');
const OUT = join(here, '..', 'migrations', '20261008101000_seed_recipe_library.sql');

type Ingredient = [string, number | null, string];
interface Recipe {
  name: string;
  cuisine: string;
  meal_type: string;
  difficulty: string;
  prep: number;
  cook: number;
  servings: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  tips?: string[];
  allergens?: string[];
  kid_friendly?: boolean;
  photo?: string;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', kg: 'kg', ml: 'ml', l: 'l', litre: 'l', liter: 'l', litres: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup', piece: 'pieces', pieces: 'pieces', pcs: 'pieces', whole: 'pieces',
  clove: 'cloves', cloves: 'cloves', pinch: 'pinch', handful: 'handful', bunch: 'bunch', 'to taste': 'to taste',
  '': 'to taste',
};

/** Never allowed. Checked in ingredient names and step text. */
const HARAM: { re: RegExp; why: string; ingredientsOnly?: boolean }[] = [
  { re: /\b(pork|bacon|ham|lard|pancetta|prosciutto|pepperoni|guanciale|gammon|crackling)\b/i, why: 'pork' },
  { re: /\b(?<!beef |chicken |halal )(chorizo|salami|sausages?)\b/i, why: 'possibly pork (say beef/chicken/halal)', ingredientsOnly: true },
  { re: /\b(wine|beer|ale|lager|rum|sake|mirin|brandy|cognac|vodka|whisk(e)?y|liqueur|sherry|port|marsala|kirsch|champagne|cider(?! vinegar)|shaoxing|rice wine|cooking wine|bourbon|gin|tequila|amaretto|kahlua)\b/i, why: 'alcohol' },
  { re: /\b(?<!halal |beef |fish |agar )(gelatin|gelatine)\b/i, why: 'gelatin (say halal gelatin)' },
  { re: /\bvanilla extract\b/i, why: 'vanilla extract contains alcohol (use vanilla powder)' },
  { re: /\bblood\b/i, why: 'blood' },
];

function q(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s: string) => s.trim().replace(/\s+/g, ' ');

const problems: string[] = [];
const notes: string[] = [];

function check(r: Recipe, file: string): Recipe | null {
  const where = `${file} › ${r?.name ?? '(no name)'}`;
  const bad = (m: string) => problems.push(`${where}: ${m}`);
  if (!r || typeof r.name !== 'string' || !r.name.trim()) return bad('missing name'), null;
  if (!r.cuisine) bad('missing cuisine');
  const mealType = MEAL_TYPES.find((m) => m.toLowerCase() === String(r.meal_type).toLowerCase());
  if (!mealType) bad(`meal_type "${r.meal_type}" must be ${MEAL_TYPES.join('/')}`);
  const difficulty = DIFFICULTIES.find((d) => d.toLowerCase() === String(r.difficulty).toLowerCase());
  if (!difficulty) bad(`difficulty "${r.difficulty}"`);
  for (const k of ['prep', 'cook', 'servings'] as const) {
    if (typeof r[k] !== 'number' || r[k] < 0 || r[k] > 1440) bad(`${k} must be a number of minutes/servings`);
  }
  if (!Array.isArray(r.ingredients) || r.ingredients.length < 2) bad('needs ingredients');
  if (!Array.isArray(r.steps) || r.steps.length < 2) bad('needs at least 2 steps');

  const ingredients: Ingredient[] = [];
  const seen = new Set<string>();
  for (const raw of r.ingredients ?? []) {
    if (!Array.isArray(raw) || typeof raw[0] !== 'string') {
      bad(`bad ingredient ${JSON.stringify(raw)}`);
      continue;
    }
    const name = raw[0].trim().toLowerCase().replace(/\s+/g, ' ');
    let qty = raw[1] === null || raw[1] === undefined || raw[1] === '' ? null : Number(raw[1]);
    if (qty !== null && (!Number.isFinite(qty) || qty < 0)) {
      bad(`quantity for "${name}" is not a number`);
      qty = null;
    }
    const unit = UNIT_ALIASES[String(raw[2] ?? '').trim().toLowerCase()];
    if (!unit) bad(`unit "${raw[2]}" for "${name}" is not allowed`);
    if (seen.has(name)) {
      notes.push(`${where}: duplicate ingredient "${name}" merged`);
      continue;
    }
    seen.add(name);
    ingredients.push([name, qty, unit ?? 'to taste']);
  }

  const text = [...ingredients.map((i) => i[0]), ...(r.steps ?? []), ...(r.tips ?? [])].join(' \n ');
  const ingredientText = ingredients.map((i) => i[0]).join(' \n ');
  for (const h of HARAM) {
    const m = (h.ingredientsOnly ? ingredientText : text).match(h.re);
    if (m) bad(`not halal — "${m[0]}" (${h.why})`);
  }

  // Allergens: detected from ingredients, plus anything the file lists.
  const detected = detectAllergens(ingredients.map((i) => i[0]));
  for (const a of r.allergens ?? []) {
    const rule = ruleForAllergy(a);
    if (!rule) notes.push(`${where}: unknown allergen "${a}" ignored`);
    else if (!detected.has(rule.name)) {
      notes.push(`${where}: file lists ${rule.name} but no ingredient matched — kept to be safe`);
      detected.add(rule.name);
    }
  }
  const listed = new Set((r.allergens ?? []).map((a) => ruleForAllergy(a)?.name).filter(Boolean));
  for (const d of detected) if (r.allergens && !listed.has(d)) notes.push(`${where}: added missing allergen ${d}`);

  return {
    ...r,
    name: titleCase(r.name),
    meal_type: mealType ?? 'Dinner',
    difficulty: difficulty ?? 'Medium',
    ingredients,
    allergens: ALLERGEN_RULES.map((x) => x.name).filter((n) => detected.has(n)),
    steps: (r.steps ?? []).map((s) => String(s).trim()).filter(Boolean),
    tips: (r.tips ?? []).map((s) => String(s).trim()).filter(Boolean),
  };
}

function dietTags(r: Recipe): string[] {
  const names = r.ingredients.map((i) => i[0]);
  const base = { ingredients: names, protein: r.protein ?? null, carbs: r.carbs ?? null, tags: r.kid_friendly ? ['Kid-friendly'] : [] };
  return ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Low-carb', 'High-protein', 'Kid-friendly'].filter((d) =>
    fitsDiet(d, base)
  );
}

function photoPrompt(r: Recipe): string {
  return `${r.name} (${r.cuisine}). ${r.photo || r.description}`.slice(0, 600);
}

// ── Load ─────────────────────────────────────────────────────────────
const files = readdirSync(RECIPE_DIR).filter((f) => f.endsWith('.json')).sort();
const recipes: Recipe[] = [];
const byName = new Map<string, string>();
for (const f of files) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(RECIPE_DIR, f), 'utf8'));
  } catch (e) {
    problems.push(`${f}: not valid JSON — ${(e as Error).message}`);
    continue;
  }
  const list = Array.isArray(data) ? data : [];
  for (const raw of list as Recipe[]) {
    const r = check(raw, f);
    if (!r) continue;
    const key = r.name.toLowerCase();
    if (byName.has(key)) {
      notes.push(`${f} › ${r.name}: duplicate of a recipe in ${byName.get(key)} — skipped`);
      continue;
    }
    byName.set(key, f);
    recipes.push(r);
  }
}

// ── Report ───────────────────────────────────────────────────────────
const count = (k: keyof Recipe) =>
  Object.entries(recipes.reduce<Record<string, number>>((m, r) => ((m[String(r[k])] = (m[String(r[k])] ?? 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `${n} ${c}`)
    .join(', ');
console.log(`${recipes.length} recipes from ${files.length} files`);
console.log(`Meal types: ${count('meal_type')}`);
console.log(`Cuisines (${new Set(recipes.map((r) => r.cuisine)).size}): ${count('cuisine')}`);
if (notes.length) console.log(`\nNotes (${notes.length}):\n  ${notes.join('\n  ')}`);
if (problems.length) {
  console.error(`\nProblems (${problems.length}) — fix these:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
if (process.argv.includes('--check')) process.exit(0);

// ── SQL ──────────────────────────────────────────────────────────────
// Set-based statements (one INSERT per table) keep the file small enough to
// paste into the Supabase SQL editor.
const out: string[] = [];
const ALLERGEN_ALIASES = ALLERGEN_RULES.map((r) => ({ name: r.name, names: [r.name.toLowerCase(), ...r.aliases] }));
const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Low-carb', 'High-protein', 'Kid-friendly'];
const values = (rows: unknown[][]) => rows.map((r) => `    (${r.map(q).join(', ')})`).join(',\n');
const RECIPE = (col: string) => `(SELECT id FROM public.recipes WHERE lower(name) = lower(${col}) LIMIT 1)`;

out.push(`/*
# Seed: Firdam recipe library (${recipes.length} halal recipes, ${new Set(recipes.map((r) => r.cuisine)).size} cuisines)

Generated by supabase/seed/build-recipes.mts from the JSON files in supabase/seed/recipes —
edit those files and re-run the script rather than editing this file.

Safe to run more than once and on existing projects: rows are matched by
name, so existing recipes are kept and only missing pieces are added.
Allergens are linked to existing rows with the same meaning (e.g. an
existing "Milk" allergen is reused for Dairy).
*/

DO $seed$
BEGIN
`);

// Lookups
const lookups: [string, string[]][] = [
  ['cuisines', [...new Set(recipes.map((r) => r.cuisine))].sort()],
  ['meal_types', MEAL_TYPES],
  ['difficulties', DIFFICULTIES],
  ['tags', DIETS],
  ['ingredients', [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i[0])))].sort()],
];
for (const [table, names] of lookups) {
  out.push(`  INSERT INTO public.${table} (name${table === 'ingredients' ? ', halal' : ''})
  SELECT v.name${table === 'ingredients' ? ', true' : ''} FROM (VALUES
${values(names.map((n) => [n]))}
  ) AS v(name)
  WHERE NOT EXISTS (SELECT 1 FROM public.${table} t WHERE lower(t.name) = lower(v.name));
`);
}
for (const a of ALLERGEN_ALIASES) {
  out.push(`  INSERT INTO public.allergens (name) SELECT ${q(a.name)} WHERE NOT EXISTS (SELECT 1 FROM public.allergens WHERE lower(name) = ANY(ARRAY[${a.names.map(q).join(', ')}]));`);
}
out.push('');

// Recipes
out.push(`  INSERT INTO public.recipes (name, slug, short_description, cuisine_id, meal_type_id, difficulty_id,
      prep_time_minutes, cook_time_minutes, servings, calories, protein, carbs, fat, halal, is_active, is_featured)
  SELECT v.name, v.slug, v.description,
    (SELECT id FROM public.cuisines c WHERE lower(c.name) = lower(v.cuisine) LIMIT 1),
    (SELECT id FROM public.meal_types m WHERE lower(m.name) = lower(v.meal_type) LIMIT 1),
    (SELECT id FROM public.difficulties d WHERE lower(d.name) = lower(v.difficulty) LIMIT 1),
    v.prep, v.cook, v.servings, v.calories::numeric, v.protein::numeric, v.carbs::numeric, v.fat::numeric, true, true, false
  FROM (VALUES
${values(recipes.map((r) => [r.name, slugify(r.name), r.description, r.cuisine, r.meal_type, r.difficulty, r.prep, r.cook, r.servings, r.calories ?? null, r.protein ?? null, r.carbs ?? null, r.fat ?? null]))}
  ) AS v(name, slug, description, cuisine, meal_type, difficulty, prep, cook, servings, calories, protein, carbs, fat)
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes r WHERE lower(r.name) = lower(v.name));
`);

out.push(`  UPDATE public.recipes r SET image_prompt = v.prompt FROM (VALUES
${values(recipes.map((r) => [r.name, photoPrompt(r)]))}
  ) AS v(name, prompt)
  WHERE lower(r.name) = lower(v.name) AND r.image_prompt IS NULL;
`);

// Ingredients, steps, tips
out.push(`  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, display_order)
  SELECT x.recipe_id, x.ingredient_id, x.qty, x.unit, x.ord FROM (
    SELECT ${RECIPE('v.recipe')} AS recipe_id,
           (SELECT id FROM public.ingredients i WHERE lower(i.name) = lower(v.ingredient) LIMIT 1) AS ingredient_id,
           v.qty::numeric AS qty, v.unit, v.ord
    FROM (VALUES
${values(recipes.flatMap((r) => r.ingredients.map(([n, qty, unit], i) => [r.name, n, qty, unit, i + 1])))}
    ) AS v(recipe, ingredient, qty, unit, ord)
  ) x
  WHERE x.recipe_id IS NOT NULL AND x.ingredient_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = x.recipe_id AND ri.ingredient_id = x.ingredient_id);
`);

out.push(`  INSERT INTO public.recipe_steps (recipe_id, step_number, instruction)
  SELECT x.recipe_id, x.num, x.txt FROM (
    SELECT ${RECIPE('v.recipe')} AS recipe_id, v.num, v.txt
    FROM (VALUES
${values(recipes.flatMap((r) => r.steps.map((st, i) => [r.name, i + 1, st])))}
    ) AS v(recipe, num, txt)
  ) x
  WHERE x.recipe_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.recipe_steps s WHERE s.recipe_id = x.recipe_id AND s.step_number = x.num);
`);

out.push(`  INSERT INTO public.recipe_tips (recipe_id, tip, display_order)
  SELECT x.recipe_id, x.txt, x.ord FROM (
    SELECT ${RECIPE('v.recipe')} AS recipe_id, v.txt, v.ord
    FROM (VALUES
${values(recipes.flatMap((r) => (r.tips ?? []).map((t, i) => [r.name, t, i + 1])))}
    ) AS v(recipe, txt, ord)
  ) x
  WHERE x.recipe_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.recipe_tips t WHERE t.recipe_id = x.recipe_id AND t.display_order = x.ord);
`);

// Allergens and diet tags
const aliasCase = ALLERGEN_ALIASES.map((a) => `WHEN ${q(a.name)} THEN ARRAY[${a.names.map(q).join(', ')}]`).join(' ');
out.push(`  INSERT INTO public.recipe_allergens (recipe_id, allergen_id)
  SELECT DISTINCT x.recipe_id, x.allergen_id FROM (
    SELECT ${RECIPE('v.recipe')} AS recipe_id,
           (SELECT id FROM public.allergens a WHERE lower(a.name) = ANY(CASE v.allergen ${aliasCase} ELSE ARRAY[lower(v.allergen)] END) LIMIT 1) AS allergen_id
    FROM (VALUES
${values(recipes.flatMap((r) => (r.allergens ?? []).map((a) => [r.name, a])))}
    ) AS v(recipe, allergen)
  ) x
  WHERE x.recipe_id IS NOT NULL AND x.allergen_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.recipe_allergens ra WHERE ra.recipe_id = x.recipe_id AND ra.allergen_id = x.allergen_id);
`);

out.push(`  INSERT INTO public.recipe_tags (recipe_id, tag_id)
  SELECT DISTINCT x.recipe_id, x.tag_id FROM (
    SELECT ${RECIPE('v.recipe')} AS recipe_id,
           (SELECT id FROM public.tags t WHERE lower(t.name) = lower(v.tag) LIMIT 1) AS tag_id
    FROM (VALUES
${values(recipes.flatMap((r) => dietTags(r).map((t) => [r.name, t])))}
    ) AS v(recipe, tag)
  ) x
  WHERE x.recipe_id IS NOT NULL AND x.tag_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.recipe_tags rt WHERE rt.recipe_id = x.recipe_id AND rt.tag_id = x.tag_id);
`);

out.push(`EXCEPTION WHEN others THEN
  RAISE WARNING 'Recipe library seed skipped: %', SQLERRM;
END
$seed$;
`);
writeFileSync(OUT, out.join('\n'));
console.log(`\nWrote ${OUT}`);
