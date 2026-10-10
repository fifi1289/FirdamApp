#!/usr/bin/env node
/**
 * Copies the pure logic the website and the app share into mobile/src/shared,
 * rewriting imports so they resolve inside the app. Run from the repo root or
 * from mobile/:  node mobile/scripts/sync-shared.mjs
 * CI fails if the copies are out of date, so edit the sources, then re-run.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(mobile, '..');
const out = join(mobile, 'src', 'shared');

const FILES = {
  'lib/recipes/allergens.ts': 'allergens.ts',
  'features/meals/meals-config.ts': 'meals-config.ts',
  'features/meals/meal-images.ts': 'meal-images.ts',
  'features/meals/plan-core.ts': 'plan-core.ts',
  'features/groceries/grocery-utils.ts': 'grocery-utils.ts',
  'supabase/functions/_shared/pantry-units.ts': 'pantry-units.ts',
  'supabase/functions/_shared/pantry-engine.ts': 'pantry-engine.ts',
  'supabase/functions/_shared/pantry-portions.ts': 'pantry-portions.ts',
};

const REWRITES = [
  [/'@\/lib\/recipes\/allergens'/g, "'./allergens'"],
  [/'@\/features\/meals\/meals-config'/g, "'./meals-config'"],
  [/'@\/features\/meals\/meal-images'/g, "'./meal-images'"],
  [/'@\/supabase\/functions\/_shared\/(pantry-[a-z]+)'/g, "'./$1'"],
  [/'@\/types\/database'/g, "'../lib/db-types'"],
  [/(from\s+["']\.\/[a-z-]+)\.ts(["'])/g, '$1$2'],
];

mkdirSync(out, { recursive: true });
for (const [source, target] of Object.entries(FILES)) {
  let text = readFileSync(join(repo, source), 'utf8');
  for (const [pattern, replacement] of REWRITES) text = text.replace(pattern, replacement);
  const header = `// GENERATED from ${source} by mobile/scripts/sync-shared.mjs — do not edit here.\n`;
  writeFileSync(join(out, target), header + text);
}
console.log(`Synced ${Object.keys(FILES).length} shared files into mobile/src/shared`);
