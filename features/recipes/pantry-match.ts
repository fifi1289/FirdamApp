/**
 * "Cook with what I have": matches what someone has against recipe
 * ingredients. Runs entirely in the browser — no AI, no cost.
 */

/** Assumed to be in every kitchen, so they never count as missing. */
const STAPLES = [
  'salt', 'pepper', 'black pepper', 'water', 'oil', 'olive oil', 'vegetable oil', 'sunflower oil',
  'sugar', 'flour', 'butter', 'ghee',
];

const SYNONYMS: Record<string, string> = {
  chiken: 'chicken',
  chicken: 'chicken',
  tomatoes: 'tomato',
  potatoes: 'potato',
  eggs: 'egg',
  onions: 'onion',
  beef: 'beef',
  lamb: 'lamb',
  mutton: 'lamb',
  mince: 'minced',
  'ground beef': 'beef',
  chickpeas: 'chickpea',
  lentils: 'lentil',
  carrots: 'carrot',
  peppers: 'bell pepper',
  capsicum: 'bell pepper',
  yoghurt: 'yogurt',
  aubergine: 'eggplant',
  courgette: 'zucchini',
  coriander: 'cilantro',
};

export function normalizeIngredient(raw: string): string {
  let s = raw.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SYNONYMS[s]) return SYNONYMS[s];
  // Simple plural handling: tomatoes → tomato, onions → onion.
  s = s
    .split(' ')
    .map((w) => SYNONYMS[w] ?? (w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
  return s;
}

/** Splits free text like "tomato, eggs and potato" into ingredient names. */
export function parseHaveList(text: string): string[] {
  return text
    .split(/,|\band\b|\n|;|\+|&/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** Spices, dried herbs and similar cupboard basics — assumed, never "missing". */
const BASICS_RE =
  /\b(salt|water|cumin|paprika|turmeric|cinnamon|cardamom|clove|nutmeg|coriander seed|chili flake|chilli flake|chili powder|chilli powder|cayenne|garam masala|curry powder|baharat|sumac|za'?atar|ras el hanout|allspice|bay lea(?:f|ve)|oregano|thyme|black pepper|white pepper|peppercorn|saffron|ginger powder|ground ginger|dried mint|mixed spice|seven spice|stock cube|bouillon|baking powder|baking soda|vanilla|vinegar|honey|tomato paste|tomato puree)\b/;

function isStaple(name: string): boolean {
  const n = normalizeIngredient(name);
  return STAPLES.some((s) => n === s || n.endsWith(` ${s}`)) || BASICS_RE.test(n) || /^ground /.test(n);
}

const MEAT_RE = /\b(beef|lamb|mutton|veal|goat|minced|steak)\b/;

/** True when something you have covers a recipe ingredient (e.g. "chicken" covers "chicken thighs"). */
function covers(have: string, need: string): boolean {
  if (have === need) return true;
  if (have === 'meat' && MEAT_RE.test(need)) return true;
  const haveWords = have.split(' ');
  const needWords = need.split(' ');
  // Every word of what you have appears in the ingredient: "chicken" ⊂ "boneless chicken thigh".
  if (haveWords.every((w) => needWords.includes(w))) return true;
  // Or the ingredient's main word is what you have: "beef" covers "minced beef".
  return needWords.length > 0 && haveWords.includes(needWords[needWords.length - 1]!);
}

export interface PantryMatch {
  key: string;
  have: string[];
  missing: string[];
  /** Share of the non-staple, non-optional ingredients you already have (0–1). */
  score: number;
}

export function matchRecipes(
  index: Map<string, { name: string; optional: boolean }[]>,
  haveRaw: string[],
  maxMissing = 5
): PantryMatch[] {
  const have = Array.from(new Set(haveRaw.map(normalizeIngredient).filter(Boolean)));
  if (have.length === 0) return [];
  const results: PantryMatch[] = [];
  index.forEach((ingredients, key) => {
    const needed = ingredients.filter((i) => !i.optional && !isStaple(i.name));
    if (needed.length === 0) return;
    const got: string[] = [];
    const missing: string[] = [];
    for (const i of needed) {
      const n = normalizeIngredient(i.name);
      (have.some((h) => covers(h, n)) ? got : missing).push(i.name);
    }
    if (got.length === 0 || missing.length > maxMissing) return;
    results.push({ key, have: got, missing, score: got.length / needed.length });
  });
  return results.sort((a, b) => a.missing.length - b.missing.length || b.score - a.score || b.have.length - a.have.length);
}
