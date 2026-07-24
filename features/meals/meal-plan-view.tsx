'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Loader2,
  PackageX,
  Pencil,
  RefreshCw,
  Save,
  Utensils,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import type {
  GeneratedMealPlan,
  MockMeal,
} from '@/features/meals/meal-plan-generator';
import {
  formatQuantityWithUnit,
  getMealPantrySummary,
  getPlanPantrySummary,
  type MealPantrySummary,
  type MissingIngredient,
} from '@/features/meals/pantry-check';
import { MealEditDialog } from '@/features/meals/meal-edit-dialog';
import { MealDetailDialog } from '@/features/meals/meal-detail-dialog';
import type { PantryItem } from '@/types/database';

interface MealPlanViewProps {
  plan: GeneratedMealPlan;
  preferences: MealPreferencesState;
  planId: string | null;
  pantryItems: PantryItem[];
  onRegenerate: () => void;
  onBack: () => void;
}

function PantrySummaryBadge({
  summary,
  compact = false,
}: {
  summary: MealPantrySummary;
  compact?: boolean;
}) {
  if (summary.total === 0) return null;

  const config = {
    'all-available': {
      icon: CheckCircle2,
      label: compact ? 'In pantry' : 'All ingredients available',
      className:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    'some-missing': {
      icon: AlertTriangle,
      label: compact
        ? `${summary.missingCount + summary.lowCount} missing`
        : 'Some ingredients missing',
      className:
        'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    'all-missing': {
      icon: PackageX,
      label: compact ? 'Not in pantry' : 'All ingredients missing',
      className:
        'border-destructive/30 bg-destructive/10 text-destructive',
    },
  } as const;

  const { icon: Icon, label, className } = config[summary.status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

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

export function MealPlanView({
  plan,
  preferences,
  planId,
  pantryItems,
  onRegenerate,
  onBack,
}: MealPlanViewProps) {
  const supabase = createSupabaseBrowserClient();
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [editMeal, setEditMeal] = useState<MockMeal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailMeal, setDetailMeal] = useState<MockMeal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);

  useEffect(() => {
    setCurrentPlan(plan);
  }, [plan]);

  const planSummary = useMemo(
    () => getPlanPantrySummary(currentPlan, pantryItems),
    [currentPlan, pantryItems]
  );

  const handleEditSave = (updated: MockMeal) => {
    setCurrentPlan((prev) => ({
      ...prev,
      days: prev.days.map((day) => ({
        ...day,
        meals: day.meals.map((m) => (m.id === updated.id ? updated : m)),
      })),
    }));
    toast.success('Meal updated');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    onRegenerate();
    setRegenerating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: `Meal Plan — ${new Date().toLocaleDateString()}`,
      plan_data: currentPlan as unknown as Record<string, unknown>,
      preferences: preferences as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };
    const result = planId
      ? await supabase.from('meal_plans').update(payload).eq('id', planId)
      : await supabase.from('meal_plans').insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error('Could not save meal plan', {
        description: result.error.message,
      });
      return;
    }
    toast.success(
      planId ? 'Meal plan updated' : 'Meal plan saved',
      {
        description: planId
          ? 'Your changes have been saved.'
          : 'You can find it in your Recent Meal Plans.',
      }
    );
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate Plan
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {planId ? 'Save Changes' : 'Save Meal Plan'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ChefHat className="h-4 w-4 text-primary" />
              Pantry Summary
            </h2>
            {planSummary.missingIngredients.length > 0 && (
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
              value={planSummary.totalIngredients}
              accent="bg-primary/10 text-primary"
            />
            <SummaryStat
              icon={CheckCircle2}
              label="Fully available"
              value={planSummary.availableCount}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <SummaryStat
              icon={AlertTriangle}
              label="Low quantity"
              value={planSummary.lowCount}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <SummaryStat
              icon={PackageX}
              label="Missing"
              value={planSummary.missingCount}
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
                  {planSummary.usagePercentage}%
                </span>
              </div>
              <Progress
                value={planSummary.usagePercentage}
                className="mt-2.5 h-2"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {planSummary.availableCount} of {planSummary.totalIngredients}{' '}
                ingredients are in your pantry.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Meals you can prepare now
                </p>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {planSummary.completableMeals} / {planSummary.totalMeals}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1">
                  <Progress
                    value={
                      planSummary.totalMeals > 0
                        ? (planSummary.completableMeals /
                            planSummary.totalMeals) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {planSummary.completableMeals === planSummary.totalMeals
                  ? 'Every meal can be prepared with what you have.'
                  : `${planSummary.totalMeals - planSummary.completableMeals} meal${planSummary.totalMeals - planSummary.completableMeals === 1 ? '' : 's'} need ingredients from the store.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentPlan.days.map((day) => (
        <div key={day.dayIndex} className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {day.dayName}
            </h2>
            <span className="text-xs text-muted-foreground">
              {new Date(day.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {day.meals.map((meal) => {
              const summary = getMealPantrySummary(
                meal.ingredients,
                pantryItems
              );
              return (
                <Card
                  key={meal.id}
                  className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                  onClick={() => {
                    setDetailMeal(meal);
                    setDetailOpen(true);
                  }}
                >
                  <div className="relative h-32 w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-[10px] font-medium">
                      {getMealTypeLabel(meal.type)}
                    </Badge>
                    <h3 className="text-sm font-semibold text-foreground">
                      {meal.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {meal.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {meal.ingredients.length > 0 && (
                        <span>{meal.ingredients.length} ingredients</span>
                      )}
                      {(meal.prepTime > 0 || meal.cookTime > 0) && (
                        <span>
                          {meal.prepTime + meal.cookTime} min total
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meal.servings}
                      </span>
                      <span>{meal.difficulty}</span>
                    </div>
                    <div className="mt-2.5">
                      <PantrySummaryBadge summary={summary} compact />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 -ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMeal(meal);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Customize Meal
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <MissingIngredientsDialog
        missing={planSummary.missingIngredients}
        open={missingOpen}
        onOpenChange={setMissingOpen}
      />
      <MealDetailDialog
        meal={detailMeal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        pantryItems={pantryItems}
      />
      <MealEditDialog
        meal={editMeal}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
      />
    </div>
  );
}
