import type { MealIngredient } from '@/features/meals/meal-plan-generator';
import type { PantryItem } from '@/types/database';

export type IngredientStatus = 'available' | 'low' | 'missing';

export interface IngredientCheck {
  ingredient: MealIngredient;
  matchedItem: PantryItem | null;
  requiredQuantity: number;
  requiredUnit: string;
  availableQuantity: number;
  availableUnit: string;
  remainingQuantity: number;
  remainingUnit: string;
  status: IngredientStatus;
}

const STOP_WORDS = new Set([
  'and',
  'the',
  'fresh',
  'dried',
  'chopped',
  'sliced',
  'diced',
  'minced',
  'drained',
  'rinsed',
  'ripe',
  'ground',
  'whole',
  'pitted',
  'plain',
  'mixed',
  'seasonal',
  'crushed',
  'mashed',
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,().]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .join(' ');
}

function isWordBoundaryMatch(needle: string, haystack: string): boolean {
  if (!needle || !haystack) return false;
  const needleWords = needle.split(' ').filter(Boolean);
  const haystackWords = haystack.split(' ').filter(Boolean);
  if (needleWords.length === 0) return false;
  return needleWords.every((nw) =>
    haystackWords.some((hw) => hw === nw || hw.startsWith(nw) || nw.startsWith(hw))
  );
}

const WEIGHT_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
};

const VOLUME_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

const PIECE_WORDS = new Set([
  'piece',
  'pieces',
  'slice',
  'slices',
  'clove',
  'cloves',
  'can',
  'cans',
  'pinch',
  'bunch',
  'pack',
  'bottle',
  'box',
]);

const UNIT_ALIASES: Record<string, string> = {
  pieces: 'piece',
  piece: 'piece',
  slice: 'piece',
  slices: 'piece',
  clove: 'piece',
  cloves: 'piece',
  can: 'can',
  cans: 'can',
  pinch: 'pinch',
  bunch: 'bunch',
  pack: 'pack',
  bottle: 'bottle',
  box: 'box',
};

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (WEIGHT_GRAMS[u] !== undefined) return u;
  if (VOLUME_ML[u] !== undefined) return u;
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  if (PIECE_WORDS.has(u)) return 'piece';
  return u;
}

function getUnitCategory(unit: string): 'weight' | 'volume' | 'piece' | 'other' {
  const u = normalizeUnit(unit);
  if (WEIGHT_GRAMS[u] !== undefined) return 'weight';
  if (VOLUME_ML[u] !== undefined) return 'volume';
  if (PIECE_WORDS.has(u)) return 'piece';
  return 'other';
}

function toBaseValue(quantity: number, unit: string): number | null {
  const u = normalizeUnit(unit);
  if (WEIGHT_GRAMS[u] !== undefined) return quantity * WEIGHT_GRAMS[u];
  if (VOLUME_ML[u] !== undefined) return quantity * VOLUME_ML[u];
  if (PIECE_WORDS.has(u)) return quantity;
  return null;
}

function fromBaseValue(baseValue: number, unit: string): number {
  const u = normalizeUnit(unit);
  if (WEIGHT_GRAMS[u] !== undefined) return baseValue / WEIGHT_GRAMS[u];
  if (VOLUME_ML[u] !== undefined) return baseValue / VOLUME_ML[u];
  return baseValue;
}

function formatQuantity(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) {
    return value % 1000 === 0 ? `${value / 1000}k` : value.toFixed(0);
  }
  if (value < 1 && value > 0) {
    return value.toFixed(2).replace(/\.?0+$/, '');
  }
  if (value % 1 === 0) return String(value);
  return value.toFixed(1).replace(/\.0$/, '');
}

function findPantryMatch(
  ingredient: MealIngredient,
  pantry: PantryItem[]
): PantryItem | null {
  const normalizedIng = normalizeName(ingredient.name);
  if (!normalizedIng) return null;

  let bestMatch: PantryItem | null = null;
  let bestScore = 0;

  for (const item of pantry) {
    const normalizedItem = normalizeName(item.name);
    if (!normalizedItem) continue;

    if (normalizedItem === normalizedIng) {
      return item;
    }

    if (isWordBoundaryMatch(normalizedIng, normalizedItem)) {
      const score = normalizedIng.split(' ').length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }
  }

  return bestMatch;
}

export function checkIngredient(
  ingredient: MealIngredient,
  pantry: PantryItem[]
): IngredientCheck {
  const requiredQuantity = parseFloat(ingredient.quantity) || 0;
  const requiredUnit = ingredient.unit;
  const matchedItem = findPantryMatch(ingredient, pantry);

  if (!matchedItem) {
    return {
      ingredient,
      matchedItem: null,
      requiredQuantity,
      requiredUnit,
      availableQuantity: 0,
      availableUnit: requiredUnit,
      remainingQuantity: 0,
      remainingUnit: requiredUnit,
      status: 'missing',
    };
  }

  const availableUnit = matchedItem.unit;
  const availableQuantity = matchedItem.quantity;

  const reqBase = toBaseValue(requiredQuantity, requiredUnit);
  const availBase = toBaseValue(availableQuantity, availableUnit);

  if (
    reqBase !== null &&
    availBase !== null &&
    getUnitCategory(requiredUnit) === getUnitCategory(availableUnit)
  ) {
    const remainingBase = availBase - reqBase;
    const remaining = fromBaseValue(remainingBase, requiredUnit);
    return {
      ingredient,
      matchedItem,
      requiredQuantity,
      requiredUnit,
      availableQuantity,
      availableUnit,
      remainingQuantity: remaining,
      remainingUnit: requiredUnit,
      status:
        remainingBase < 0
          ? 'low'
          : remainingBase / Math.max(availBase, 1) < 0.25
            ? 'low'
            : 'available',
    };
  }

  if (
    getUnitCategory(requiredUnit) !== getUnitCategory(availableUnit) &&
    getUnitCategory(requiredUnit) !== 'other' &&
    getUnitCategory(availableUnit) !== 'other'
  ) {
    return {
      ingredient,
      matchedItem,
      requiredQuantity,
      requiredUnit,
      availableQuantity,
      availableUnit,
      remainingQuantity: availableQuantity,
      remainingUnit: availableUnit,
      status: 'low',
    };
  }

  return {
    ingredient,
    matchedItem,
    requiredQuantity,
    requiredUnit,
    availableQuantity,
    availableUnit,
    remainingQuantity: availableQuantity,
    remainingUnit: availableUnit,
    status: 'available',
  };
}

export function checkMealIngredients(
  ingredients: MealIngredient[],
  pantry: PantryItem[]
): IngredientCheck[] {
  return ingredients.map((ing) => checkIngredient(ing, pantry));
}

export type MealPantrySummary = {
  status: 'all-available' | 'some-missing' | 'all-missing';
  availableCount: number;
  lowCount: number;
  missingCount: number;
  total: number;
};

export function getMealPantrySummary(
  ingredients: MealIngredient[],
  pantry: PantryItem[]
): MealPantrySummary {
  const checks = checkMealIngredients(ingredients, pantry);
  let availableCount = 0;
  let lowCount = 0;
  let missingCount = 0;
  for (const check of checks) {
    if (check.status === 'available') availableCount++;
    else if (check.status === 'low') lowCount++;
    else missingCount++;
  }
  const total = checks.length;
  let status: MealPantrySummary['status'] = 'all-available';
  if (missingCount === total && total > 0) status = 'all-missing';
  else if (missingCount > 0 || lowCount > 0) status = 'some-missing';
  return {
    status,
    availableCount,
    lowCount,
    missingCount,
    total,
  };
}

export function formatQuantityWithUnit(quantity: number, unit: string): string {
  return `${formatQuantity(quantity)} ${unit}`.trim();
}
