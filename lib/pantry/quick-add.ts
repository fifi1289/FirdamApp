/**
 * Turns a line like "2 kg chicken, a dozen eggs, 5 potatoes, a bag of rice"
 * into pantry items, and lists the staples and common foods used by the
 * first-time pantry setup.
 */
import { guessCategory } from '@/features/groceries/grocery-utils';
import { pantryUnit } from '@/lib/pantry/store';
import type { PantryCategory, PantryUnit } from '@/types/database';

/** Foods tracked as Full / Half / Low / Out instead of exact amounts. */
const STAPLE_RE =
  /\b(rice|flour|sugar|oil|ghee|lentils?|split peas|chickpeas? \(dry\)|dried chickpeas|beans \(dry\)|pasta|spaghetti|macaroni|noodles|vermicelli|couscous|bulgur|freekeh|semolina|oats|quinoa|tea|coffee|honey|tahini|tomato paste|salt|pepper|spices?|cumin|turmeric|paprika|cinnamon|cardamom|vinegar|soy sauce|stock cubes?|baking powder|yeast|cornflour|dates)\b/i;

export function isStapleFood(name: string): boolean {
  return STAPLE_RE.test(name);
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, half: 0.5, couple: 2, few: 3, some: 1,
};
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: PantryUnit;
  category: PantryCategory;
  tracking: 'count' | 'level';
  level: 'full' | null;
}

const UNIT_WORD =
  /^(kg|kgs|kilos?|g|grams?|gr|l|litres?|liters?|ml|lbs?|pounds?|oz|packs?|packets?|bags?|bottles?|cans?|tins?|boxes|box|cartons?|jars?|dozen|pieces?|pcs|bunch(?:es)?|heads?|loaf|loaves|trays?)$/i;

function toNumber(token: string): number | null {
  const t = token.toLowerCase();
  if (NUMBER_WORDS[t] != null) return NUMBER_WORDS[t]!;
  if (FRACTIONS[t] != null) return FRACTIONS[t]!;
  const mixed = t.match(/^(\d+)([½¼¾⅓⅔])$/);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]!]!;
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "2kg chicken, a dozen eggs and 5 potatoes" → items. */
export function parseQuickAdd(text: string): ParsedItem[] {
  return text
    .split(/[,;\n]|\band\b|\+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      // Split "2kg" / "1.5L" into number + unit.
      const tokens = part.replace(/(\d)([a-zA-Z½¼¾])/g, '$1 $2').split(/\s+/);
      let quantity: number | null = null;
      let unitWord = '';
      let i = 0;
      const n = toNumber(tokens[0] ?? '');
      if (n != null) {
        quantity = n;
        i = 1;
      }
      if (tokens[i] && UNIT_WORD.test(tokens[i]!)) {
        unitWord = tokens[i]!.toLowerCase();
        i += 1;
      }
      if (tokens[i]?.toLowerCase() === 'of') i += 1;
      const name = tokens.slice(i).join(' ').replace(/^(x|×)\s*/i, '').trim();
      if (!name) return null;

      let qty = quantity ?? 1;
      let unit: PantryUnit;
      if (/^dozen$/.test(unitWord)) {
        qty *= 12;
        unit = 'Pieces';
      } else if (/^(lbs?|pounds?)$/.test(unitWord)) {
        qty = +(qty * 0.4536).toFixed(2);
        unit = 'kg';
      } else if (unitWord === 'oz') {
        qty = Math.round(qty * 28.35);
        unit = 'g';
      } else if (/^(gr|grams?)$/.test(unitWord)) unit = 'g';
      else if (/^(kgs|kilos?)$/.test(unitWord)) unit = 'kg';
      else if (/^(litres?|liters?)$/.test(unitWord)) unit = 'L';
      else if (/^(packets?|trays?)$/.test(unitWord)) unit = 'Pack';
      else if (/^(bunch|bunches|heads?|loaf|loaves|pcs|pieces?)$/.test(unitWord) || !unitWord) unit = 'Pieces';
      else unit = pantryUnit(unitWord.replace(/s$/, ''));

      const staple = isStapleFood(name);
      return {
        name: name.replace(/^\w/, (c) => c.toUpperCase()),
        quantity: qty,
        unit,
        category: guessCategory(name),
        tracking: staple ? 'level' : 'count',
        level: staple ? 'full' : null,
      } satisfies ParsedItem;
    })
    .filter((x): x is ParsedItem => x !== null);
}

/** First-time setup: tick what you have. Staples get a level; fresh food a typical amount. */
export const SETUP_ITEMS: { name: string; group: string; staple: boolean; quantity?: number; unit?: PantryUnit }[] = [
  // Staples
  { name: 'Rice', group: 'Cupboard', staple: true },
  { name: 'Flour', group: 'Cupboard', staple: true },
  { name: 'Sugar', group: 'Cupboard', staple: true },
  { name: 'Vegetable oil', group: 'Cupboard', staple: true },
  { name: 'Olive oil', group: 'Cupboard', staple: true },
  { name: 'Ghee', group: 'Cupboard', staple: true },
  { name: 'Red lentils', group: 'Cupboard', staple: true },
  { name: 'Brown lentils', group: 'Cupboard', staple: true },
  { name: 'Pasta', group: 'Cupboard', staple: true },
  { name: 'Couscous', group: 'Cupboard', staple: true },
  { name: 'Bulgur', group: 'Cupboard', staple: true },
  { name: 'Oats', group: 'Cupboard', staple: true },
  { name: 'Semolina', group: 'Cupboard', staple: true },
  { name: 'Tomato paste', group: 'Cupboard', staple: true },
  { name: 'Tahini', group: 'Cupboard', staple: true },
  { name: 'Honey', group: 'Cupboard', staple: true },
  { name: 'Dates', group: 'Cupboard', staple: true },
  { name: 'Tea', group: 'Cupboard', staple: true },
  { name: 'Canned chickpeas', group: 'Cupboard', staple: false, quantity: 2, unit: 'Can' },
  { name: 'Canned chopped tomatoes', group: 'Cupboard', staple: false, quantity: 2, unit: 'Can' },
  { name: 'Coconut milk', group: 'Cupboard', staple: false, quantity: 1, unit: 'Can' },
  // Fresh
  { name: 'Onions', group: 'Fresh', staple: false, quantity: 1, unit: 'kg' },
  { name: 'Garlic', group: 'Fresh', staple: false, quantity: 1, unit: 'Pieces' },
  { name: 'Potatoes', group: 'Fresh', staple: false, quantity: 1, unit: 'kg' },
  { name: 'Tomatoes', group: 'Fresh', staple: false, quantity: 6, unit: 'Pieces' },
  { name: 'Carrots', group: 'Fresh', staple: false, quantity: 500, unit: 'g' },
  { name: 'Lemons', group: 'Fresh', staple: false, quantity: 3, unit: 'Pieces' },
  { name: 'Cucumbers', group: 'Fresh', staple: false, quantity: 3, unit: 'Pieces' },
  { name: 'Peppers', group: 'Fresh', staple: false, quantity: 3, unit: 'Pieces' },
  { name: 'Fresh parsley', group: 'Fresh', staple: false, quantity: 1, unit: 'Pieces' },
  { name: 'Fresh coriander', group: 'Fresh', staple: false, quantity: 1, unit: 'Pieces' },
  { name: 'Ginger', group: 'Fresh', staple: false, quantity: 1, unit: 'Pieces' },
  // Fridge & freezer
  { name: 'Eggs', group: 'Fridge & freezer', staple: false, quantity: 12, unit: 'Pieces' },
  { name: 'Milk', group: 'Fridge & freezer', staple: false, quantity: 2, unit: 'L' },
  { name: 'Plain yogurt', group: 'Fridge & freezer', staple: false, quantity: 500, unit: 'g' },
  { name: 'Butter', group: 'Fridge & freezer', staple: false, quantity: 250, unit: 'g' },
  { name: 'Cheese', group: 'Fridge & freezer', staple: false, quantity: 200, unit: 'g' },
  { name: 'Chicken', group: 'Fridge & freezer', staple: false, quantity: 1, unit: 'kg' },
  { name: 'Minced beef', group: 'Fridge & freezer', staple: false, quantity: 500, unit: 'g' },
  { name: 'Lamb', group: 'Fridge & freezer', staple: false, quantity: 1, unit: 'kg' },
  { name: 'Frozen peas', group: 'Fridge & freezer', staple: false, quantity: 500, unit: 'g' },
  { name: 'Bread', group: 'Fridge & freezer', staple: false, quantity: 1, unit: 'Pack' },
];
