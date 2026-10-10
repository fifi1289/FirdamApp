// GENERATED from features/groceries/grocery-utils.ts by mobile/scripts/sync-shared.mjs — do not edit here.
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  type GroceryItem,
  type PantryCategory,
  type PantryUnit,
} from '../lib/db-types';

/** Order categories roughly the way a store is laid out. */
export const AISLE_ORDER: PantryCategory[] = [
  'Fruits',
  'Vegetables',
  'Meat',
  'Poultry',
  'Seafood',
  'Dairy',
  'Eggs',
  'Bakery',
  'Grains',
  'Pasta & Rice',
  'Canned Foods',
  'Spices',
  'Oils & Condiments',
  'Snacks',
  'Beverages',
  'Frozen Foods',
  'Other',
];

const KEYWORDS: [PantryCategory, string[]][] = [
  ['Poultry', ['chicken', 'turkey', 'duck', 'poultry', 'wings', 'drumstick']],
  ['Meat', ['beef', 'lamb', 'mutton', 'goat', 'veal', 'mince', 'kofta', 'steak', 'sausage', 'merguez', 'meat']],
  ['Seafood', ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'cod', 'sardine', 'tilapia']],
  ['Eggs', ['egg']],
  ['Dairy', ['milk', 'cheese', 'yogurt', 'yoghurt', 'labneh', 'butter', 'cream', 'ghee', 'laban', 'feta', 'halloumi']],
  ['Bakery', ['bread', 'pita', 'naan', 'bun', 'croissant', 'tortilla', 'khubz', 'baguette', 'roti', 'paratha']],
  ['Pasta & Rice', ['rice', 'pasta', 'spaghetti', 'noodle', 'couscous', 'vermicelli', 'macaroni', 'basmati']],
  ['Grains', ['flour', 'oats', 'bulgur', 'quinoa', 'barley', 'semolina', 'lentil', 'chickpea', 'bean', 'freekeh']],
  ['Spices', ['cumin', 'turmeric', 'paprika', 'cinnamon', 'cardamom', 'saffron', 'salt', 'black pepper', 'pepper flakes', 'chili flakes', 'powder', 'sumac', "za'atar", 'zaatar', 'masala', 'spice', 'clove', 'nutmeg', 'baharat']],
  ['Fruits', ['apple', 'banana', 'orange', 'lemon', 'lime', 'date', 'grape', 'mango', 'berry', 'berries', 'pomegranate', 'melon', 'fig', 'apricot', 'pear', 'peach']],
  ['Vegetables', ['onion', 'garlic', 'tomato', 'potato', 'carrot', 'pepper', 'cucumber', 'spinach', 'lettuce', 'parsley', 'coriander', 'cilantro', 'mint', 'zucchini', 'eggplant', 'aubergine', 'cabbage', 'okra', 'broccoli', 'ginger', 'celery', 'mushroom']],
  ['Oils & Condiments', ['oil', 'vinegar', 'sauce', 'ketchup', 'mayo', 'tahini', 'honey', 'jam', 'mustard', 'harissa', 'molasses', 'paste']],
  ['Canned Foods', ['canned', 'tin', 'can of']],
  ['Beverages', ['juice', 'water', 'tea', 'coffee', 'soda', 'drink']],
  ['Snacks', ['chips', 'crisps', 'biscuit', 'cookie', 'chocolate', 'nuts', 'almond', 'pistachio', 'cracker', 'candy']],
  ['Frozen Foods', ['frozen', 'ice cream']],
];

export function guessCategory(name: string): PantryCategory {
  const n = name.toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (words.some((w) => n.includes(w))) return category;
  }
  return 'Other';
}

/** Categories where it's worth reminding to buy from a halal source. */
export function needsHalalSource(category: PantryCategory): boolean {
  return category === 'Meat' || category === 'Poultry';
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  lb: 'lb',
  lbs: 'lb',
  oz: 'oz',
  ml: 'ml',
  l: 'L',
  litre: 'L',
  liter: 'L',
  litres: 'L',
  liters: 'L',
  pack: 'Pack',
  packs: 'Pack',
  bottle: 'Bottle',
  bottles: 'Bottle',
  can: 'Can',
  cans: 'Can',
  box: 'Box',
  boxes: 'Box',
  dozen: 'dozen',
  bunch: 'bunch',
  bunches: 'bunch',
  pcs: 'Pieces',
  pieces: 'Pieces',
  x: 'Pieces',
};

/** "2 kg chicken thighs" → { quantity: 2, unit: 'kg', name: 'chicken thighs' } */
export function parseQuickAdd(input: string): { name: string; quantity: number | null; unit: string | null } {
  const text = input.trim().replace(/\s+/g, ' ');
  const m = text.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (!m) {
    const trailing = text.match(/^(.+?)\s+x\s*(\d+)$/i);
    if (trailing) return { name: trailing[1]!, quantity: Number(trailing[2]), unit: null };
    return { name: text, quantity: null, unit: null };
  }
  const [, qtyRaw, unitRaw, rest] = m;
  let quantity: number;
  if (qtyRaw!.includes('/')) {
    const [a, b] = qtyRaw!.split('/').map(Number);
    quantity = b ? a! / b : a!;
  } else {
    quantity = Number(qtyRaw!.replace(',', '.'));
  }
  if (unitRaw) {
    const alias = UNIT_ALIASES[unitRaw.toLowerCase()];
    if (alias) return { name: rest!, quantity, unit: alias === 'Pieces' ? null : alias };
    // The "unit" was actually the start of the name ("2 lemons").
    return { name: `${unitRaw} ${rest}`, quantity, unit: null };
  }
  return { name: rest!, quantity, unit: null };
}

export function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity === null || quantity === undefined) return unit ?? '';
  const q = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/\.?0+$/, '');
  return unit ? `${q} ${unit}` : `× ${q}`;
}

export function toPantryUnit(unit: string | null): PantryUnit {
  if (!unit) return 'Pieces';
  const match = PANTRY_UNITS.find((u) => u.toLowerCase() === unit.toLowerCase());
  return match ?? 'Pieces';
}

export function asPantryCategory(c: string): PantryCategory {
  return (PANTRY_CATEGORIES as string[]).includes(c) ? (c as PantryCategory) : 'Other';
}

export function groupByAisle(items: GroceryItem[]): { category: PantryCategory; items: GroceryItem[] }[] {
  const map = new Map<PantryCategory, GroceryItem[]>();
  for (const item of items) {
    const c = asPantryCategory(item.category);
    const list = map.get(c) ?? [];
    list.push(item);
    map.set(c, list);
  }
  return AISLE_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    items: map.get(category)!,
  }));
}

/** Plain-text version of a list, for WhatsApp / SMS / notes. */
export function listToText(name: string, items: GroceryItem[]): string {
  const lines = [`🛒 ${name}`];
  for (const group of groupByAisle(items.filter((i) => !i.checked))) {
    lines.push('', group.category);
    for (const i of group.items) {
      const qty = formatQty(i.quantity, i.unit);
      lines.push(`• ${i.name}${qty ? ` — ${qty}` : ''}`);
    }
  }
  lines.push('', 'Shared from Firdam');
  return lines.join('\n');
}
