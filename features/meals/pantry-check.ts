/**
 * Meal-planner view of the pantry engine (lib/pantry/engine.ts): per-ingredient
 * checks for a meal, and a whole-plan summary that reserves pantry food across
 * the week so the same potatoes aren't counted for two meals.
 */
import type { MealIngredient } from '@/features/meals/meal-plan-generator';
import type { PantryItem } from '@/types/database';
import { checkNeeds, Ledger, type Line, type Need, type PantryLike } from '@/lib/pantry/engine';
import { formatAmount } from '@/lib/pantry/units';

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
  /** Plain-language note, e.g. "need 4 pieces · have 1 piece" or "running low". */
  note: string;
}

function toNeed(i: MealIngredient): Need {
  const q = parseFloat(i.quantity);
  return { name: i.name, quantity: Number.isFinite(q) && q > 0 ? q : null, unit: i.unit ?? '' };
}

function statusOf(line: Line): IngredientStatus {
  if (line.status === 'missing') return 'missing';
  if (line.status === 'short' || line.status === 'staple-low') return 'low';
  return 'available';
}

function toCheck(ingredient: MealIngredient, line: Line): IngredientCheck {
  const required = line.scaled ?? (parseFloat(ingredient.quantity) || 0);
  const short = line.shortfall?.quantity ?? null;
  return {
    ingredient,
    matchedItem: (line.item as PantryItem | null) ?? null,
    requiredQuantity: required,
    requiredUnit: ingredient.unit,
    availableQuantity: line.item ? Number(line.item.quantity) || 0 : 0,
    availableUnit: line.item?.unit ?? ingredient.unit,
    remainingQuantity: short != null ? -short : line.item ? Number(line.item.quantity) - (line.use ?? 0) : 0,
    remainingUnit: short != null ? line.shortfall!.unit : line.item?.unit ?? ingredient.unit,
    status: statusOf(line),
    note:
      line.status === 'basic'
        ? 'kitchen basic'
        : line.status === 'staple' || line.status === 'staple-low'
          ? line.haveText
          : line.status === 'missing'
            ? 'not in your pantry'
            : line.status === 'short'
              ? `need ${line.neededText} · have ${line.haveText}`
              : line.status === 'have-some'
                ? 'in your pantry'
                : `have ${line.haveText}`,
  };
}

export function checkIngredient(ingredient: MealIngredient, pantry: PantryItem[]): IngredientCheck {
  const check = checkNeeds([toNeed(ingredient)], pantry as PantryLike[]);
  return toCheck(ingredient, check.lines[0]!);
}

export function checkMealIngredients(ingredients: MealIngredient[], pantry: PantryItem[]): IngredientCheck[] {
  const check = checkNeeds(ingredients.map(toNeed), pantry as PantryLike[]);
  return ingredients.map((ing, i) => toCheck(ing, check.lines[i]!));
}

export type MealPantrySummary = {
  status: 'all-available' | 'some-missing' | 'all-missing';
  availableCount: number;
  lowCount: number;
  missingCount: number;
  total: number;
};

export function getMealPantrySummary(ingredients: MealIngredient[], pantry: PantryItem[]): MealPantrySummary {
  const checks = checkMealIngredients(ingredients, pantry);
  const availableCount = checks.filter((c) => c.status === 'available').length;
  const lowCount = checks.filter((c) => c.status === 'low').length;
  const missingCount = checks.filter((c) => c.status === 'missing').length;
  const total = checks.length;
  return {
    status: missingCount === total && total > 0 ? 'all-missing' : missingCount > 0 || lowCount > 0 ? 'some-missing' : 'all-available',
    availableCount,
    lowCount,
    missingCount,
    total,
  };
}

export interface MissingIngredient {
  name: string;
  neededQuantity: number;
  neededUnit: string;
  availableQuantity: number;
  availableUnit: string;
  missingQuantity: number;
  missingUnit: string;
  meals: string[];
}

export interface PlanPantrySummary {
  totalIngredients: number;
  availableCount: number;
  lowCount: number;
  missingCount: number;
  usagePercentage: number;
  completableMeals: number;
  totalMeals: number;
  missingIngredients: MissingIngredient[];
}

/**
 * Checks a whole plan day by day, taking each meal's ingredients out of a
 * running copy of the pantry, so later meals only count what's left.
 */
export function getPlanPantrySummary(
  plan: { days: { meals: { id: string; name: string; ingredients: MealIngredient[] }[] }[] },
  pantry: PantryItem[]
): PlanPantrySummary {
  const ledger = new Ledger(pantry as PantryLike[]);
  let totalIngredients = 0;
  let availableCount = 0;
  let lowCount = 0;
  let missingCount = 0;
  let completableMeals = 0;
  let totalMeals = 0;
  const missingMap = new Map<string, MissingIngredient>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      totalMeals++;
      const check = checkNeeds(meal.ingredients.map(toNeed), pantry as PantryLike[], { ledger, commit: true });
      let complete = true;
      check.lines.forEach((line, idx) => {
        if (line.status === 'basic' || line.status === 'optional') return;
        totalIngredients++;
        const st = statusOf(line);
        if (st === 'available') availableCount++;
        else if (st === 'low') lowCount++;
        else missingCount++;
        if (line.status === 'missing' || line.status === 'short') {
          complete = false;
          const s = line.shortfall;
          const ing = meal.ingredients[idx]!;
          const key = `${ing.name.toLowerCase()}|${s?.unit ?? ''}`;
          const prev = missingMap.get(key);
          if (prev) {
            prev.missingQuantity = +(prev.missingQuantity + (s?.quantity ?? 0)).toFixed(2);
            prev.neededQuantity = +(prev.neededQuantity + (line.scaled ?? 0)).toFixed(2);
            if (!prev.meals.includes(meal.name)) prev.meals.push(meal.name);
          } else {
            missingMap.set(key, {
              name: ing.name,
              neededQuantity: line.scaled ?? 0,
              neededUnit: ing.unit,
              availableQuantity: line.item ? Number(line.item.quantity) || 0 : 0,
              availableUnit: line.item?.unit ?? ing.unit,
              missingQuantity: s?.quantity ?? 0,
              missingUnit: s?.unit ?? '',
              meals: [meal.name],
            });
          }
        }
      });
      if (complete && meal.ingredients.length > 0) completableMeals++;
    }
  }

  return {
    totalIngredients,
    availableCount,
    lowCount,
    missingCount,
    usagePercentage: totalIngredients > 0 ? Math.round((availableCount / totalIngredients) * 100) : 0,
    completableMeals,
    totalMeals,
    missingIngredients: Array.from(missingMap.values()),
  };
}

export function formatQuantityWithUnit(quantity: number, unit: string): string {
  if (!quantity && !unit) return '';
  return formatAmount(quantity, unit);
}
