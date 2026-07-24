'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  PackageX,
  Soup,
  Users,
  Utensils,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import type { MockMeal } from '@/features/meals/meal-plan-generator';
import {
  checkMealIngredients,
  formatQuantityWithUnit,
  type IngredientCheck,
  type IngredientStatus,
} from '@/features/meals/pantry-check';
import type { PantryItem } from '@/types/database';

interface MealDetailDialogProps {
  meal: MockMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pantryItems: PantryItem[];
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const STATUS_CONFIG: Record<
  IngredientStatus,
  { icon: typeof CheckCircle2; label: string; className: string; textClass: string }
> = {
  available: {
    icon: CheckCircle2,
    label: 'Available',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  low: {
    icon: AlertTriangle,
    label: 'Low quantity',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  missing: {
    icon: PackageX,
    label: 'Not available',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    textClass: 'text-destructive',
  },
};

function PantryStatusRow({ check }: { check: IngredientCheck }) {
  const config = STATUS_CONFIG[check.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {check.ingredient.name}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Required</span>
          <span className="font-medium text-foreground">
            {formatQuantityWithUnit(
              check.requiredQuantity,
              check.requiredUnit
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Available</span>
          <span className="font-medium text-foreground">
            {check.matchedItem
              ? formatQuantityWithUnit(
                  check.availableQuantity,
                  check.availableUnit
                )
              : 'Not in pantry'}
          </span>
        </div>
        {check.status === 'available' && (
          <div className="flex items-center justify-between gap-2">
            <span>Remaining</span>
            <span className={`font-medium ${config.textClass}`}>
              {formatQuantityWithUnit(
                check.remainingQuantity,
                check.remainingUnit
              )}
            </span>
          </div>
        )}
        {check.status === 'low' && check.matchedItem && (
          <div className="flex items-center justify-between gap-2">
            <span>Status</span>
            <span className={`font-medium ${config.textClass}`}>
              Insufficient quantity
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MealDetailDialog({
  meal,
  open,
  onOpenChange,
  pantryItems,
}: MealDetailDialogProps) {
  const checks = meal
    ? checkMealIngredients(meal.ingredients, pantryItems)
    : [];

  const availableCount = checks.filter((c) => c.status === 'available').length;
  const lowCount = checks.filter((c) => c.status === 'low').length;
  const missingCount = checks.filter((c) => c.status === 'missing').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {meal && (
          <>
            <div className="relative -mx-6 -mt-6 h-44 w-[calc(100%+3rem)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meal.image}
                alt={meal.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge
                  variant="secondary"
                  className="bg-white/90 text-foreground shadow-sm"
                >
                  {getMealTypeLabel(meal.type)}
                </Badge>
                <Badge
                  className={`${DIFFICULTY_STYLES[meal.difficulty] ?? DIFFICULTY_STYLES.Medium} shadow-sm`}
                >
                  {meal.difficulty}
                </Badge>
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-lg">{meal.name}</DialogTitle>
              <DialogDescription>{meal.description}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {meal.prepTime}
                </span>
                <span className="text-muted-foreground">min prep</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {meal.cookTime}
                </span>
                <span className="text-muted-foreground">min cook</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Soup className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {meal.prepTime + meal.cookTime}
                </span>
                <span className="text-muted-foreground">min total</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {meal.servings}
                </span>
                <span className="text-muted-foreground">servings</span>
              </div>
            </div>

            {meal.ingredients.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ChefHat className="h-4 w-4 text-primary" />
                  Ingredients
                </h4>
                <ul className="space-y-1.5">
                  {meal.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 text-sm text-foreground"
                    >
                      <span>{ing.name}</span>
                      {ing.quantity && (
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {ing.quantity} {ing.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.ingredients.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PackageX className="h-4 w-4 text-primary" />
                      Pantry Status
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]">
                      {availableCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {availableCount}
                        </span>
                      )}
                      {lowCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {lowCount}
                        </span>
                      )}
                      {missingCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-destructive">
                          <PackageX className="h-3 w-3" />
                          {missingCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {pantryItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      Your pantry is empty. Add items in the Pantry module to
                      see availability for this meal.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {checks.map((check, i) => (
                        <PantryStatusRow key={i} check={check} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {meal.recipe.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Recipe
                  </h4>
                  <ol className="space-y-3">
                    {meal.recipe.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-relaxed text-foreground">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
