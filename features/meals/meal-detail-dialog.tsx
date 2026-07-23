'use client';

import {
  ChefHat,
  Clock,
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

interface MealDetailDialogProps {
  meal: MockMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function MealDetailDialog({
  meal,
  open,
  onOpenChange,
}: MealDetailDialogProps) {
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
