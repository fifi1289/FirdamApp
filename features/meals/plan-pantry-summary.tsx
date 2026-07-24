'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  PackageX,
  Utensils,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formatQuantityWithUnit,
  type MissingIngredient,
  type PlanPantrySummary as PlanPantrySummaryData,
} from '@/features/meals/pantry-check';

function SummaryStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none text-foreground tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-[11px] leading-none text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function MissingIngredientsDialog({
  missing,
  open,
  onOpenChange,
}: {
  missing: MissingIngredient[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-destructive" />
            Missing Ingredients
          </DialogTitle>
          <DialogDescription>
            {missing.length === 0
              ? 'You have everything you need for this meal plan.'
              : `${missing.length} ingredient${missing.length === 1 ? '' : 's'} need attention across your meal plan.`}
          </DialogDescription>
        </DialogHeader>

        {missing.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">
              All ingredients available
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your pantry covers every ingredient in this meal plan.
            </p>
          </div>
        ) : (
          <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
            {missing.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {item.name}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    <PackageX className="h-3 w-3" />
                    {item.meals.length} meal{item.meals.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">Need</p>
                    <p className="mt-0.5 font-medium text-foreground">
                      {formatQuantityWithUnit(
                        item.neededQuantity,
                        item.neededUnit
                      )}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">Available</p>
                    <p className="mt-0.5 font-medium text-foreground">
                      {item.availableQuantity > 0
                        ? formatQuantityWithUnit(
                            item.availableQuantity,
                            item.availableUnit
                          )
                        : 'None'}
                    </p>
                  </div>
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-2">
                    <p className="text-destructive/80 dark:text-destructive/70">
                      Missing
                    </p>
                    <p className="mt-0.5 font-semibold text-destructive">
                      {formatQuantityWithUnit(
                        item.missingQuantity,
                        item.missingUnit
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Used in: {item.meals.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PlanPantrySummary({
  summary,
  variant = 'full',
}: {
  summary: PlanPantrySummaryData;
  variant?: 'full' | 'compact';
}) {
  const [missingOpen, setMissingOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className={variant === 'compact' ? 'p-4' : 'p-5'}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ChefHat className="h-4 w-4 text-primary" />
              Pantry Summary
            </h2>
            {summary.missingIngredients.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setMissingOpen(true)}
              >
                <PackageX className="mr-1.5 h-3.5 w-3.5" />
                View Missing Ingredients
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryStat
              icon={Utensils}
              label="Total ingredients"
              value={summary.totalIngredients}
              accent="bg-primary/10 text-primary"
            />
            <SummaryStat
              icon={CheckCircle2}
              label="Fully available"
              value={summary.availableCount}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <SummaryStat
              icon={AlertTriangle}
              label="Low quantity"
              value={summary.lowCount}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <SummaryStat
              icon={PackageX}
              label="Missing"
              value={summary.missingCount}
              accent="bg-destructive/10 text-destructive"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Estimated pantry usage
                </p>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {summary.usagePercentage}%
                </span>
              </div>
              <Progress
                value={summary.usagePercentage}
                className="mt-2.5 h-2"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {summary.availableCount} of {summary.totalIngredients}{' '}
                ingredients are in your pantry.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Meals you can prepare now
                </p>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {summary.completableMeals} / {summary.totalMeals}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1">
                  <Progress
                    value={
                      summary.totalMeals > 0
                        ? (summary.completableMeals /
                            summary.totalMeals) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {summary.completableMeals === summary.totalMeals
                  ? 'Every meal can be prepared with what you have.'
                  : `${summary.totalMeals - summary.completableMeals} meal${summary.totalMeals - summary.completableMeals === 1 ? '' : 's'} need ingredients from the store.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MissingIngredientsDialog
        missing={summary.missingIngredients}
        open={missingOpen}
        onOpenChange={setMissingOpen}
      />
    </>
  );
}
