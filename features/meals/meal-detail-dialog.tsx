'use client';

import { Clock, Soup, Utensils } from 'lucide-react';

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

export function MealDetailDialog({
  meal,
  open,
  onOpenChange,
}: MealDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {meal && (
          <>
            <div className="relative -mx-6 -mt-6 h-40 w-[calc(100%+3rem)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meal.image}
                alt={meal.name}
                className="h-full w-full object-cover"
              />
            </div>
            <DialogHeader>
              <Badge
                variant="outline"
                className="mb-2 w-fit text-[10px] font-medium"
              >
                {getMealTypeLabel(meal.type)}
              </Badge>
              <DialogTitle className="text-lg">{meal.name}</DialogTitle>
              <DialogDescription>{meal.description}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {meal.prepTime} min prep
              </span>
              <span className="flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5" />
                {meal.cookTime} min cook
              </span>
              <span className="flex items-center gap-1.5">
                <Soup className="h-3.5 w-3.5" />
                {meal.prepTime + meal.cookTime} min total
              </span>
            </div>

            {meal.ingredients.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Ingredients
                </h4>
                <ul className="space-y-1.5">
                  {meal.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.recipe && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Recipe
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {meal.recipe}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
