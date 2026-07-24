'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PackageX,
  Pencil,
  RefreshCw,
  Save,
  Utensils,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import type {
  GeneratedMealPlan,
  MockMeal,
} from '@/features/meals/meal-plan-generator';
import {
  getMealPantrySummary,
  getPlanPantrySummary,
  type MealPantrySummary,
} from '@/features/meals/pantry-check';
import { PlanPantrySummary } from '@/features/meals/plan-pantry-summary';
import { MealEditDialog } from '@/features/meals/meal-edit-dialog';
import { MealDetailDialog } from '@/features/meals/meal-detail-dialog';
import { MealImage } from '@/features/meals/meal-image';
import { formatWeekRange } from '@/features/meals/meal-plan-generator';
import type { PantryItem } from '@/types/database';

interface MealWithLocation {
  meal: MockMeal;
  dayIndex: number;
  dayName: string;
  mealIndex: number;
}

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
  const [conflictPlanId, setConflictPlanId] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Swap state
  const [swapSource, setSwapSource] = useState<MealWithLocation | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    setCurrentPlan(plan);
  }, [plan]);

  const planSummary = useMemo(
    () => getPlanPantrySummary(currentPlan, pantryItems),
    [currentPlan, pantryItems]
  );

  // All meals in the plan with their location, used to populate the swap dialog
  const allMealsWithLocation = useMemo<MealWithLocation[]>(() => {
    const result: MealWithLocation[] = [];
    currentPlan.days.forEach((day) => {
      day.meals.forEach((meal, mealIndex) => {
        result.push({
          meal,
          dayIndex: day.dayIndex,
          dayName: day.dayName,
          mealIndex,
        });
      });
    });
    return result;
  }, [currentPlan]);

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

  // Silent save used after a swap — does not navigate away
  const silentSave = async (updatedPlan: GeneratedMealPlan) => {
    if (!planId) return;
    const { error } = await supabase
      .from('meal_plans')
      .update({
        plan_data: updatedPlan as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);
    if (error) {
      toast.error('Could not persist swap', { description: error.message });
    }
  };

  const openSwapDialog = (source: MealWithLocation) => {
    setSwapSource(source);
    setSwapOpen(true);
  };

  const handleSwapSelect = async (target: MealWithLocation) => {
    if (!swapSource) return;
    setSwapping(true);

    const newPlan: GeneratedMealPlan = {
      ...currentPlan,
      days: currentPlan.days.map((day) => {
        if (day.dayIndex !== swapSource.dayIndex && day.dayIndex !== target.dayIndex) {
          return day;
        }
        return {
          ...day,
          meals: day.meals.map((m, idx) => {
            // Source day: replace the source meal slot with the target meal
            if (day.dayIndex === swapSource.dayIndex && idx === swapSource.mealIndex) {
              return target.meal;
            }
            // Target day: replace the target meal slot with the source meal
            if (day.dayIndex === target.dayIndex && idx === target.mealIndex) {
              return swapSource.meal;
            }
            return m;
          }),
        };
      }),
    };

    setCurrentPlan(newPlan);
    setSwapOpen(false);
    setSwapSource(null);
    await silentSave(newPlan);
    setSwapping(false);
    toast.success('Meals swapped successfully.');
  };

  const persistSave = async (replaceId?: string) => {
    setSaving(true);
    const weekLabel = formatWeekRange(currentPlan.weekStartDate);
    const payload = {
      name: `Meal Plan — ${weekLabel}`,
      plan_data: currentPlan as unknown as Record<string, unknown>,
      preferences: preferences as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };

    if (replaceId) {
      const { error: delError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', replaceId);
      if (delError) {
        setSaving(false);
        toast.error('Could not replace meal plan', { description: delError.message });
        return;
      }
    }

    const result = planId && !replaceId
      ? await supabase.from('meal_plans').update(payload).eq('id', planId)
      : await supabase.from('meal_plans').insert(payload);

    setSaving(false);
    if (result.error) {
      toast.error('Could not save meal plan', { description: result.error.message });
      return;
    }
    toast.success(planId && !replaceId ? 'Meal plan updated' : 'Meal plan saved', {
      description: planId && !replaceId
        ? 'Your changes have been saved.'
        : 'You can find it in your Meal Plans.',
    });
    onBack();
  };

  const handleSave = async () => {
    if (planId) {
      await persistSave();
      return;
    }
    setSaving(true);
    const { data: existing, error: checkError } = await supabase
      .from('meal_plans')
      .select('id, plan_data')
      .order('created_at', { ascending: false });
    setSaving(false);
    if (checkError) {
      toast.error('Could not check for existing plans', { description: checkError.message });
      return;
    }
    const duplicate = (existing ?? []).find((row) => {
      const pd = row.plan_data as Record<string, unknown>;
      return pd?.weekStartDate === currentPlan.weekStartDate;
    });
    if (duplicate) {
      setConflictPlanId(duplicate.id);
      setConflictDialogOpen(true);
      return;
    }
    await persistSave();
  };

  const handleReplaceExisting = async () => {
    setConflictDialogOpen(false);
    if (conflictPlanId) {
      await persistSave(conflictPlanId);
    }
  };

  // Group swap candidates by day for display in the dialog
  const swapCandidatesByDay = useMemo(() => {
    if (!swapSource) return [];
    const candidates = allMealsWithLocation.filter(
      (loc) =>
        !(loc.dayIndex === swapSource.dayIndex && loc.mealIndex === swapSource.mealIndex)
    );
    const dayMap = new Map<number, { dayName: string; items: MealWithLocation[] }>();
    candidates.forEach((loc) => {
      if (!dayMap.has(loc.dayIndex)) {
        dayMap.set(loc.dayIndex, { dayName: loc.dayName, items: [] });
      }
      dayMap.get(loc.dayIndex)!.items.push(loc);
    });
    return Array.from(dayMap.values());
  }, [swapSource, allMealsWithLocation]);

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

      <PlanPantrySummary summary={planSummary} />

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          {formatWeekRange(currentPlan.weekStartDate)}
        </h2>
      </div>

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
            {day.meals.map((meal, mealIndex) => {
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
                    <MealImage
                      src={meal.image}
                      alt={meal.name}
                      category={meal.type}
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
                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditMeal(meal);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Customize
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSwapDialog({
                            meal,
                            dayIndex: day.dayIndex,
                            dayName: day.dayName,
                            mealIndex,
                          });
                        }}
                      >
                        <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                        Swap
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Swap Dialog */}
      <Dialog open={swapOpen} onOpenChange={(open) => { if (!swapping) setSwapOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Swap Meal</DialogTitle>
            <DialogDescription>
              Swapping{' '}
              <span className="font-medium text-foreground">
                {swapSource?.meal.name}
              </span>{' '}
              on <span className="font-medium text-foreground">{swapSource?.dayName}</span>.
              Select the meal to swap it with.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-1">
            <div className="space-y-5 py-1">
              {swapCandidatesByDay.map((group) => (
                <div key={group.dayName}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.dayName}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((loc) => (
                      <button
                        key={`${loc.dayIndex}-${loc.mealIndex}`}
                        disabled={swapping}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                        onClick={() => handleSwapSelect(loc)}
                      >
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                          <MealImage
                            src={loc.meal.image}
                            alt={loc.meal.name}
                            category={loc.meal.type}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {getMealTypeLabel(loc.meal.type)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                            {loc.meal.name}
                          </p>
                        </div>
                        {swapping && (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Meal Plan Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A meal plan already exists for{' '}
              <span className="font-medium text-foreground">
                {formatWeekRange(currentPlan.weekStartDate)}
              </span>
              . Would you like to replace it with this new plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplaceExisting}>
              Replace Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
