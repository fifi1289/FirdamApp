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
const out: string[] = [];
const ALLERGEN_ALIASES = ALLERGEN_RULES.map((r) => ({ name: r.name, names: [r.name.toLowerCase(), ...r.aliases] }));
const aliasArray = (name: string) =>
  `ARRAY[${(ALLERGEN_ALIASES.find((a) => a.name === name)?.names ?? [name.toLowerCase()]).map(q).join(', ')}]`;

out.push(`/*
# Seed: Firdam recipe library (${recipes.length} halal recipes)

Generated by supabase/seed/build-recipes.mts from supabase/seed/recipes/*.json —
edit those files and re-run the script rather than editing this file.

Safe to run more than once and on existing projects: rows are matched by
name, so existing recipes are kept and only missing pieces are added.
Allergens and diet tags are linked to existing rows with the same meaning
(e.g. an existing "Milk" allergen is reused for Dairy).
*/

DO $seed$
BEGIN
`);

const cuisines = [...new Set(recipes.map((r) => r.cuisine))].sort();
for (const [table, values] of [
  ['cuisines', cuisines],
  ['meal_types', MEAL_TYPES],
  ['difficulties', DIFFICULTIES],
  ['tags', ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Low-carb', 'High-protein', 'Kid-friendly']],
] as const) {
  for (const v of values) {
    out.push(`  INSERT INTO public.${table} (name) SELECT ${q(v)} WHERE NOT EXISTS (SELECT 1 FROM public.${table} WHERE lower(name) = lower(${q(v)}));`);
  }
}
for (const a of ALLERGEN_ALIASES) {
  out.push(`  INSERT INTO public.allergens (name) SELECT ${q(a.name)} WHERE NOT EXISTS (SELECT 1 FROM public.allergens WHERE lower(name) = ANY(${aliasArray(a.name)}));`);
}
out.push('');
const ingredientNames = [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i[0])))].sort();
for (const ing of ingredientNames) {
  out.push(`  INSERT INTO public.ingredients (name, halal) SELECT ${q(ing)}, true WHERE NOT EXISTS (SELECT 1 FROM public.ingredients WHERE lower(name) = lower(${q(ing)}));`);
}
out.push('');

for (const r of recipes) {
  const n = q(r.name);
  const R = `(SELECT id FROM public.recipes WHERE lower(name) = lower(${n}) LIMIT 1)`;
  out.push(`  -- ${r.name}`);
  out.push(`  INSERT INTO public.recipes (name, slug, short_description, cuisine_id, meal_type_id, difficulty_id,
      prep_time_minutes, cook_time_minutes, servings, calories, protein, carbs, fat, halal, is_active, is_featured)
    SELECT ${n}, ${q(slugify(r.name))}, ${q(r.description)},
      (SELECT id FROM public.cuisines WHERE lower(name) = lower(${q(r.cuisine)}) LIMIT 1),
      (SELECT id FROM public.meal_types WHERE lower(name) = lower(${q(r.meal_type)}) LIMIT 1),
      (SELECT id FROM public.difficulties WHERE lower(name) = lower(${q(r.difficulty)}) LIMIT 1),
      ${r.prep}, ${r.cook}, ${r.servings}, ${q(r.calories ?? null)}, ${q(r.protein ?? null)}, ${q(r.carbs ?? null)}, ${q(r.fat ?? null)}, true, true, false
    WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE lower(name) = lower(${n}));`);
  out.push(`  UPDATE public.recipes SET image_prompt = ${q(photoPrompt(r))} WHERE id = ${R} AND image_prompt IS NULL;`);
  r.ingredients.forEach(([ing, qty, unit], idx) => {
    out.push(`  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, display_order)
    SELECT r.id, i.id, ${q(qty)}, ${q(unit)}, ${idx + 1} FROM ${R} r, (SELECT id FROM public.ingredients WHERE lower(name) = lower(${q(ing)}) LIMIT 1) i
    WHERE r.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.ingredient_id = i.id);`);
  });
  r.steps.forEach((s, idx) => {
    out.push(`  INSERT INTO public.recipe_steps (recipe_id, step_number, instruction)
    SELECT r.id, ${idx + 1}, ${q(s)} FROM ${R} r
    WHERE r.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.recipe_steps s WHERE s.recipe_id = r.id AND s.step_number = ${idx + 1});`);
  });
  (r.tips ?? []).forEach((t, idx) => {
    out.push(`  INSERT INTO public.recipe_tips (recipe_id, tip, display_order)
    SELECT r.id, ${q(t)}, ${idx + 1} FROM ${R} r
    WHERE r.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.recipe_tips t WHERE t.recipe_id = r.id AND t.display_order = ${idx + 1});`);
  });
  for (const a of r.allergens ?? []) {
    out.push(`  INSERT INTO public.recipe_allergens (recipe_id, allergen_id)
    SELECT r.id, a.id FROM ${R} r, (SELECT id FROM public.allergens WHERE lower(name) = ANY(${aliasArray(a)}) LIMIT 1) a
    WHERE r.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.recipe_allergens x WHERE x.recipe_id = r.id AND x.allergen_id = a.id);`);
  }
  for (const t of dietTags(r)) {
    out.push(`  INSERT INTO public.recipe_tags (recipe_id, tag_id)
    SELECT r.id, t.id FROM ${R} r, (SELECT id FROM public.tags WHERE lower(name) = lower(${q(t)}) LIMIT 1) t
    WHERE r.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.recipe_tags x WHERE x.recipe_id = r.id AND x.tag_id = t.id);`);
  }
  out.push('');
}

out.push(`EXCEPTION WHEN others THEN
  RAISE WARNING 'Recipe library seed skipped: %', SQLERRM;
END
$seed$;
`);
writeFileSync(OUT, out.join('\n'));
console.log(`\nWrote ${OUT}`);
