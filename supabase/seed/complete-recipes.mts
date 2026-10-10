/**
 * Ingredients and methods for library recipes that were imported with only a
 * name and details. Written by hand in supabase/seed/recipe-completions/*.txt,
 * checked here (format, units, halal, allergens) and turned into SQL that calls
 * public.complete_recipe for each one.
 *
 *   node --experimental-strip-types supabase/seed/complete-recipes.mts [file.txt ...]
 *
 * Writes <name>.json (checked, compact rows) next to each .txt, plus <name>.sql
 * for loading by hand (git-ignored; the SQL Editor or psql can run it).
 * Exits with an error if any recipe fails a check.
 *
 * Format (one recipe per block):
 *   @ <recipe uuid> | Recipe name
 *   i: 300 g basmati rice | 2 pieces onion; finely chopped | ?1 handful parsley | salt to taste
 *   s: First step. | Second step. | Third step.
 * "?" marks an optional ingredient; text after ";" is a note.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLERGEN_RULES, detectAllergens } from '../functions/_shared/allergens.ts';
import { haramReason } from '../functions/_shared/halal.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, 'recipe-completions');

const UNITS = new Set(['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pieces', 'cloves', 'pinch', 'handful', 'bunch', 'can', 'slices', 'cm', 'sprigs', 'stalks', 'leaves', 'sheets']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Ready-made products that hide allergens: name what's in them instead.
const VAGUE = /\b(pesto|curry paste|stir[- ]fry sauce|spice mix|seasoning mix|cake mix|ready[- ]made sauce)\b/;
// Meat and similar must be named halal.
const NEEDS_HALAL = /\b(beef|lamb|mutton|goat|veal|chicken|turkey|duck|mince|sausages?|gelatine?|merguez|sucuk|sujuk|pastirma|basturma|liver|kofta meat)\b/;
const HALAL_EXEMPT = /\b(halal|stock cube|bouillon|stock|broth)\b|chickpea|chicken of the woods/;

interface Item { name: string; quantity: number | null; unit: string; optional: boolean; notes: string | null }
interface Recipe { id: string; name: string; items: Item[]; steps: { instruction: string; minutes: number | null }[] }

function parseQty(s: string): number | null {
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split('/').map(Number);
    return a! / b!;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseItem(raw: string, where: string): Item {
  let text = raw.trim();
  const optional = text.startsWith('?');
  if (optional) text = text.slice(1).trim();
  const [main, ...noteParts] = text.split(';');
  const notes = noteParts.join(';').trim() || null;
  let body = main!.trim().toLowerCase();
  if (/ to taste$/.test(body)) {
    return { name: body.replace(/ to taste$/, '').trim(), quantity: null, unit: 'to taste', optional, notes };
  }
  const m = body.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+([a-z]+)\s+(.+)$/);
  if (!m) throw new Error(`${where}: can't read "${raw}" (expected "<amount> <unit> <name>" or "<name> to taste")`);
  const quantity = parseQty(m[1]!);
  if (quantity == null) throw new Error(`${where}: bad amount in "${raw}"`);
  if (!UNITS.has(m[2]!)) throw new Error(`${where}: unknown unit "${m[2]}" in "${raw}"`);
  body = m[3]!.trim();
  return { name: body, quantity: Math.round(quantity * 100) / 100, unit: m[2]!, optional, notes };
}

function parse(file: string): Recipe[] {
  const text = readFileSync(file, 'utf8');
  const out: Recipe[] = [];
  let cur: Partial<Recipe> | null = null;
  const done = () => {
    if (!cur) return;
    if (!cur.items || !cur.steps) throw new Error(`${cur.name}: needs both an i: and an s: line`);
    out.push(cur as Recipe);
  };
  text.split('\n').forEach((line, n) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const where = `${file.split('/').pop()}:${n + 1}`;
    if (l.startsWith('@')) {
      done();
      const [id, ...name] = l.slice(1).split('|');
      cur = { id: id!.trim(), name: name.join('|').trim() };
      if (!UUID.test(cur.id!)) throw new Error(`${where}: bad recipe id`);
    } else if (l.startsWith('i:') && cur) {
      cur.items = l.slice(2).split('|').map((s) => parseItem(s, `${where} (${cur!.name})`));
    } else if (l.startsWith('s:') && cur) {
      cur.steps = l
        .slice(2)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((instruction) => {
          const mins = instruction.match(/(\d+)(?:[–-]\d+)? (?:minutes|mins?)\b/);
          return { instruction, minutes: mins ? Number(mins[1]) : null };
        });
    } else {
      throw new Error(`${where}: unexpected line "${l.slice(0, 40)}"`);
    }
  });
  done();
  return out;
}

function check(r: Recipe): string[] {
  const problems: string[] = [];
  const names = r.items.map((i) => i.name);
  if (r.items.length < 4) problems.push('fewer than 4 ingredients');
  if (r.items.length > 20) problems.push('more than 20 ingredients');
  if (r.steps.length < 3) problems.push('fewer than 3 steps');
  if (new Set(names).size !== names.length) problems.push('the same ingredient twice');
  const haram = haramReason(names, r.steps.map((s) => s.instruction));
  if (haram) problems.push(`not halal: ${haram}`);
  for (const n of names) {
    if (VAGUE.test(n)) problems.push(`"${n}" hides its allergens — list what's in it`);
    if (NEEDS_HALAL.test(n) && !HALAL_EXEMPT.test(n)) problems.push(`"${n}" should say halal`);
  }
  return problems;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => f.endsWith('.txt')).sort().map((f) => join(DIR, f));

let failed = 0;
let total = 0;
const seen = new Set<string>();
for (const file of files) {
  const recipes = parse(file);
  const rows: unknown[] = [];
  for (const r of recipes) {
    if (seen.has(r.id)) {
      console.error(`✗ ${r.name}: listed twice`);
      failed++;
      continue;
    }
    seen.add(r.id);
    const problems = check(r);
    if (problems.length) {
      console.error(`✗ ${r.name}: ${problems.join('; ')}`);
      failed++;
      continue;
    }
    const found = detectAllergens(r.items.map((i) => i.name));
    // Compact rows: [id, [[name, qty, unit, optional, notes]…], [[step, minutes]…], [allergen…]]
    rows.push([
      r.id,
      r.items.map((i) => [i.name, i.quantity, i.unit, i.optional ? 1 : 0, i.notes]),
      r.steps.map((st) => [st.instruction, st.minutes]),
      ALLERGEN_RULES.filter((rule) => found.has(rule.name)).map((rule) => rule.name),
    ]);
  }
  total += recipes.length;
  const json = JSON.stringify(rows).replace(/'/g, "''");
  const aliasRows = ALLERGEN_RULES.map((r) => `('${r.name}', '${JSON.stringify([r.name.toLowerCase(), ...r.aliases])}'::jsonb)`).join(', ');
  const sql = `-- Generated by supabase/seed/complete-recipes.mts from ${file.split('/').pop()} — do not edit.
WITH aliases(name, names) AS (VALUES ${aliasRows}),
rows AS (SELECT x FROM jsonb_array_elements('${json}'::jsonb) x)
SELECT count(*) FILTER (WHERE public.complete_recipe(
  (x->>0)::uuid,
  (SELECT jsonb_agg(jsonb_build_object('name', i->0, 'quantity', i->1, 'unit', i->2, 'optional', (i->>3)::int = 1, 'notes', i->4)) FROM jsonb_array_elements(x->1) i),
  (SELECT jsonb_agg(jsonb_build_object('instruction', s->0, 'minutes', s->1)) FROM jsonb_array_elements(x->2) s),
  coalesce((SELECT jsonb_agg(a.names) FROM jsonb_array_elements_text(x->3) n JOIN aliases a ON a.name = n), '[]'::jsonb)
) > 0) AS completed
FROM rows;
`;
  writeFileSync(file.replace(/\.txt$/, '.sql'), sql);
  writeFileSync(file.replace(/\.txt$/, '.json'), JSON.stringify(rows) + '\n');
}
console.log(`${total - failed} of ${total} recipes ready${failed ? `, ${failed} need fixing` : ''}`);
if (failed) process.exit(1);
