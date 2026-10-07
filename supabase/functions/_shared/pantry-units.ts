/**
 * Ingredient names and amounts: matching a recipe's "chicken thighs" to the
 * pantry's "Chicken", and converting between grams, millilitres and pieces
 * (1 potato ≈ 200 g, 1 cup rice ≈ 190 g) so recipes and pantry can be compared.
 */

export type Base = 'g' | 'ml' | 'pc';

// ── Names ────────────────────────────────────────────────────────────

/** Words that describe preparation or quality, not what the food is. */
const DESCRIPTORS = new Set([
  'fresh', 'freshly', 'dried', 'dry', 'chopped', 'sliced', 'diced', 'minced', 'grated', 'crushed', 'mashed', 'ground',
  'whole', 'plain', 'unsalted', 'salted', 'large', 'small', 'medium', 'ripe', 'boneless', 'skinless', 'skin-on',
  'bone-in', 'warm', 'cold', 'hot', 'cooked', 'uncooked', 'raw', 'frozen', 'canned', 'tinned', 'drained', 'rinsed',
  'peeled', 'pitted', 'extra', 'virgin', 'light', 'dark', 'fine', 'finely', 'coarse', 'roughly', 'thinly', 'thick',
  'organic', 'halal', 'good', 'quality', 'free-range', 'lean', 'full-fat', 'low-fat', 'shredded', 'toasted', 'roasted',
  'boiled', 'soft', 'hard', 'baby', 'young', 'mixed', 'assorted', 'of', 'and', 'or', 'the', 'a', 'for', 'to', 'serve',
  'serving', 'garnish', 'optional', 'room', 'temperature', 'store-bought', 'homemade', 'ready-made', 'pieces', 'piece',
]);

const SYNONYMS: Record<string, string> = {
  chiken: 'chicken', aubergine: 'eggplant', courgette: 'zucchini', coriander: 'cilantro', capsicum: 'bell pepper',
  yoghurt: 'yogurt', mince: 'minced meat', prawn: 'shrimp', chilli: 'chili', chile: 'chili', chillies: 'chili',
  chilies: 'chili', scallion: 'spring onion', 'green onion': 'spring onion', garbanzo: 'chickpea', 'icing sugar': 'sugar',
  'caster sugar': 'sugar', 'granulated sugar': 'sugar', 'white sugar': 'sugar', 'brown sugar': 'sugar',
  'all-purpose flour': 'flour', 'plain flour': 'flour', 'self-raising flour': 'flour', 'bread flour': 'flour',
  'sunflower oil': 'oil', 'vegetable oil': 'oil', 'canola oil': 'oil', 'rapeseed oil': 'oil', 'cooking oil': 'oil',
  'olive oil': 'olive oil', 'whole milk': 'milk', 'semi-skimmed milk': 'milk', 'skimmed milk': 'milk',
};

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(tomato|potato|mango)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

/** "Boneless chicken thighs" → "chicken thigh"; "Plain flour" → "flour". */
export function ingredientKey(name: string): string {
  let s = name.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SYNONYMS[s]) return SYNONYMS[s]!;
  const words = s
    .split(' ')
    .map((w) => SYNONYMS[w] ?? w)
    .join(' ')
    .split(' ')
    .filter((w) => w && !DESCRIPTORS.has(w))
    .map(singular);
  s = words.join(' ').trim();
  return SYNONYMS[s] ?? s;
}

const PROTEINS = ['chicken', 'beef', 'lamb', 'mutton', 'goat', 'veal', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp'];

/**
 * How well a pantry item covers a recipe ingredient (0 = not at all).
 * 3 = same food, 2 = pantry name is a broader word ("chicken" covers
 * "chicken thigh"), 1 = same meat, different cut ("chicken breast" for "chicken thigh").
 */
export function matchScore(pantryName: string, ingredientName: string): number {
  const p = ingredientKey(pantryName);
  const n = ingredientKey(ingredientName);
  if (!p || !n) return 0;
  if (p === n) return 3;
  const pw = p.split(' ');
  const nw = n.split(' ');
  if (pw.every((w) => nw.includes(w))) {
    // "oil" shouldn't cover "olive oil"… but does cover "vegetable oil" (already "oil").
    if (p === 'oil' && n.includes('olive')) return 1;
    return 2;
  }
  if (nw.every((w) => pw.includes(w)) && nw.length >= 1 && !/^(oil|sugar|flour|rice|milk)$/.test(n)) return 2;
  const protein = PROTEINS.find((x) => pw.includes(x) && nw.includes(x));
  if (protein) return 1;
  return 0;
}

// ── Always-available basics ──────────────────────────────────────────

const BASIC_RE =
  /\b(salt|water|ice|cumin|paprika|turmeric|cinnamon|cardamom|clove|nutmeg|chili flake|chili powder|cayenne|garam masala|curry powder|baharat|sumac|zaatar|ras el hanout|allspice|bay leaf|oregano|thyme|black pepper|white pepper|peppercorn|saffron|ginger powder|mixed spice|seven spice|stock cube|bouillon|baking powder|baking soda|bicarbonate|vanilla powder|vinegar|yeast|coriander seed|fennel seed|mustard seed|nigella|fenugreek|dried mint|dried lime|berbere|five spice|spice)\b/;

/** Salt, water and dried spices: assumed in every kitchen, never "missing" or deducted. */
export function isBasic(name: string): boolean {
  const n = ingredientKey(name).replace(/-/g, ' ');
  const raw = name.toLowerCase();
  return BASIC_RE.test(n) || /\bground\b/.test(raw) && !/\b(beef|lamb|meat|chicken|turkey|almond)\b/.test(raw);
}

// ── Amounts ──────────────────────────────────────────────────────────

const MASS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, kilo: 1000, oz: 28.35, lb: 453.6, lbs: 453.6 };
const VOLUME: Record<string, number> = {
  ml: 1, l: 1000, litre: 1000, liter: 1000, tsp: 5, teaspoon: 5, tbsp: 15, tablespoon: 15, cup: 240, cups: 240,
};
const COUNT = new Set(['pieces', 'piece', 'pc', 'pcs', 'cloves', 'clove', 'slices', 'slice', 'whole', 'can', 'cans', 'tin']);

/** Units that only say "some" (we can't measure a pinch or a handful). */
const PRESENCE_ONLY = new Set(['pinch', 'handful', 'bunch', 'to taste', 'pack', 'bottle', 'box', 'bag', 'jar', 'sprig', '']);

/** Typical weight of one piece, by key word (last match wins for specificity). */
const PIECE_GRAMS: [RegExp, number][] = [
  [/potato/, 200], [/sweet potato/, 250], [/onion/, 150], [/red onion/, 150], [/shallot/, 30], [/spring onion/, 15],
  [/tomato/, 120], [/cherry tomato/, 15], [/garlic/, 5], [/lemon/, 100], [/lime/, 60], [/orange/, 180],
  [/carrot/, 70], [/bell pepper|red pepper|green pepper|yellow pepper/, 150], [/chili|chilli|jalapeno|scotch bonnet/, 15],
  [/cucumber/, 300], [/eggplant/, 300], [/zucchini/, 200], [/apple/, 180], [/banana/, 120], [/avocado/, 170],
  [/mango/, 300], [/egg\b/, 55], [/chicken breast/, 200], [/chicken thigh/, 120], [/chicken drumstick|drumstick/, 110],
  [/chicken wing/, 90], [/whole chicken/, 1500], [/pita|pitta|flatbread|naan|tortilla|wrap|roti|chapati/, 70],
  [/bread roll|bun/, 60], [/date/, 8], [/fig/, 50], [/okra/, 12], [/cabbage/, 900], [/cauliflower/, 600],
  [/broccoli/, 350], [/lettuce/, 400], [/mushroom/, 20], [/plantain/, 250], [/pear/, 180], [/peach/, 150],
  [/beetroot|beet/, 150], [/turnip/, 150], [/leek/, 200], [/celery/, 40], [/ginger/, 30], [/cinnamon stick/, 3],
  [/cardamom pod/, 0.3], [/lemongrass/, 20], [/can|tin/, 400],
];

/** Grams per millilitre, for converting cups/spoons of dry foods to weight. */
const DENSITY: [RegExp, number][] = [
  [/rice/, 0.8], [/flour|semolina|cornflour|cornstarch/, 0.55], [/sugar/, 0.85], [/oil|ghee/, 0.92],
  [/butter/, 0.96], [/milk|yogurt|cream|labneh/, 1.03], [/honey|molasses|syrup/, 1.4], [/lentil|split pea/, 0.8],
  [/chickpea|bean/, 0.75], [/bulgur|couscous|freekeh|quinoa/, 0.75], [/oat/, 0.4], [/pasta|noodle|vermicelli|orzo/, 0.45],
  [/nut|almond|walnut|pistachio|cashew|peanut/, 0.6], [/raisin|date/, 0.65], [/coconut/, 0.35], [/cheese/, 0.45],
  [/tomato paste|tomato puree|tahini|paste/, 1.1], [/water|juice|stock|broth|vinegar|sauce/, 1.0],
];

function lookup(table: [RegExp, number][], name: string): number | null {
  const n = ingredientKey(name);
  let found: number | null = null;
  for (const [re, v] of table) if (re.test(n)) found = v;
  return found;
}

export const gramsPerPiece = (name: string) => lookup(PIECE_GRAMS, name);
export const density = (name: string) => lookup(DENSITY, name);

function normUnit(unit: string | null | undefined): string {
  return (unit ?? '').toLowerCase().trim();
}

/** True when an amount in this unit can't really be measured (a pinch, a bunch, a pack). */
export function isPresenceOnly(unit: string | null | undefined, quantity: number | null | undefined): boolean {
  const u = normUnit(unit);
  return quantity == null || quantity <= 0 || PRESENCE_ONLY.has(u) || (!MASS[u] && !VOLUME[u] && !COUNT.has(u));
}

/** Amount in its natural base (g, ml or pieces), or null if it can't be measured. */
export function toBase(quantity: number | null | undefined, unit: string | null | undefined, name: string): { amount: number; base: Base } | null {
  if (isPresenceOnly(unit, quantity)) return null;
  const u = normUnit(unit);
  if (MASS[u]) return { amount: quantity! * MASS[u]!, base: 'g' };
  if (VOLUME[u]) return { amount: quantity! * VOLUME[u]!, base: 'ml' };
  if (u === 'can' || u === 'cans' || u === 'tin') return { amount: quantity! * 400, base: 'g' };
  return { amount: quantity!, base: 'pc' };
}

/** Converts between g, ml and pieces for a given food. Null when we don't know how. */
export function convertBase(amount: number, from: Base, to: Base, name: string): number | null {
  if (from === to) return amount;
  const d = density(name);
  const p = gramsPerPiece(name);
  const toGrams = (a: number, b: Base): number | null => (b === 'g' ? a : b === 'ml' ? (d ? a * d : null) : p ? a * p : null);
  const g = toGrams(amount, from);
  if (g == null) return null;
  if (to === 'g') return g;
  if (to === 'ml') return d ? g / d : null;
  return p ? g / p : null;
}

/** Converts an amount into a pantry item's own unit (e.g. 3 potatoes → kg). */
export function toUnit(amount: number, base: Base, unit: string, name: string): number | null {
  const target = toBase(1, unit, name);
  if (!target) return null;
  const converted = convertBase(amount, base, target.base, name);
  return converted == null ? null : converted / target.amount;
}

// ── Display ──────────────────────────────────────────────────────────

const round = (n: number, step: number) => Math.round(n / step) * step;

/** "1.25 kg", "800 g", "3 pieces", "2 tbsp". */
export function formatAmount(quantity: number | null | undefined, unit: string | null | undefined): string {
  const u = normUnit(unit);
  if (quantity == null || quantity <= 0) return u === 'to taste' ? 'to taste' : 'some';
  if (u === 'g' && quantity >= 1000) return `${+(quantity / 1000).toFixed(2)} kg`;
  if (u === 'ml' && quantity >= 1000) return `${+(quantity / 1000).toFixed(2)} L`;
  const n = quantity >= 100 ? round(quantity, 5) : quantity >= 10 ? Math.round(quantity) : +quantity.toFixed(quantity < 1 ? 2 : 1);
  if (u === 'pieces' || u === 'piece') return `${n} ${n === 1 ? 'piece' : 'pieces'}`;
  if (!u) return String(n);
  return `${n} ${u === 'l' ? 'L' : unit}`;
}

/** Picks a friendly unit for a base amount: pieces for countable foods, else g/ml. */
export function friendly(amount: number, base: Base, name: string): { quantity: number; unit: string } {
  if (base === 'pc') return { quantity: Math.ceil(amount - 0.05), unit: 'pieces' };
  const p = gramsPerPiece(name);
  if (p && p >= 30) {
    const grams = base === 'g' ? amount : convertBase(amount, base, 'g', name);
    if (grams != null) return { quantity: Math.max(1, Math.ceil(grams / p - 0.15)), unit: 'pieces' };
  }
  if (base === 'g') return amount >= 1000 ? { quantity: +(amount / 1000).toFixed(2), unit: 'kg' } : { quantity: Math.ceil(amount / 10) * 10 || amount, unit: 'g' };
  return amount >= 1000 ? { quantity: +(amount / 1000).toFixed(2), unit: 'L' } : { quantity: Math.ceil(amount / 10) * 10 || amount, unit: 'ml' };
}
