'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_PREFERENCES,
  getMealTypeLabel,
  type MealPreferencesState,
} from '@/features/meals/meals-config';
import { MealPreferencesForm } from '@/features/meals/meal-preferences-form';
import { MealPlanView } from '@/features/meals/meal-plan-view';
import {
  mockMealPlanGenerator,
  type GeneratedMealPlan,
} from '@/features/meals/meal-plan-generator';
import type { MealPlanRecord } from '@/types/database';

type View = 'home' | 'preferences' | 'plan';

export function MealsDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preferences, setPreferences] = useState<MealPreferencesState>(
    DEFAULT_PREFERENCES
  );
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedMealPlan | null>(
    null
  );
  const [savedPlans, setSavedPlans] = useState<MealPlanRecord[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<MealPlanRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPreferences = useCallback(async () => {
    const { data, error } = await supabase
      .from('meal_preferences')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Failed to load meal preferences:', error.message);
    }
    if (data) {
      setPreferences({
        planningDuration: data.planning_duration,
        mealTypes: data.meal_types,
        usePantryFirst: data.use_pantry_first,
        dietaryPreferences: data.dietary_preferences,
        allergies: data.allergies,
      });
    }
  }, [supabase]);

  const loadSavedPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load saved meal plans:', error.message);
    }
    setSavedPlans(data ?? []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadPreferences(), loadSavedPlans()]);
      setLoading(false);
    })();
  }, [loadPreferences, loadSavedPlans]);

  const handleGenerate = async (prefs: MealPreferencesState) => {
    setPreferences(prefs);
    setGenerating(true);

    const { error: prefError } = await supabase
      .from('meal_preferences')
      .upsert(
        {
          planning_duration: prefs.planningDuration,
          meal_types: prefs.mealTypes,
          use_pantry_first: prefs.usePantryFirst,
          dietary_preferences: prefs.dietaryPreferences,
          allergies: prefs.allergies,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (prefError) {
      console.error('Failed to save preferences:', prefError.message);
    }

    const plan = await mockMealPlanGenerator.generate({ preferences: prefs });
    setGeneratedPlan(plan);
    setActivePlanId(null);
    setGenerating(false);
    setView('plan');
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    const plan = await mockMealPlanGenerator.generate({ preferences });
    setGeneratedPlan(plan);
    setGenerating(false);
  };

  const handleBackHome = async () => {
    await loadSavedPlans();
    setGeneratedPlan(null);
    setActivePlanId(null);
    setView('home');
  };

  const openSavedPlan = (record: MealPlanRecord) => {
    const plan = record.plan_data as unknown as GeneratedMealPlan;
    if (!plan || !Array.isArray(plan.days)) {
      toast.error('This meal plan could not be opened.');
      return;
    }
    setGeneratedPlan(plan);
    setActivePlanId(record.id);
    setView('plan');
  };

  const confirmDeletePlan = async () => {
    if (!deletingPlan) return;
    const id = deletingPlan.id;
    setDeleting(true);
    const { error } = await supabase.from('meal_plans').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      toast.error('Could not delete meal plan', { description: error.message });
      return;
    }
    setSavedPlans((prev) => prev.filter((p) => p.id !== id));
    setDeleteOpen(false);
    setDeletingPlan(null);
    toast.success('Meal plan deleted');
  };

  if (view === 'preferences' || generating) {
    return (
      <AppShell>
        <PageHeader
          title="Meal Planner"
          description="Plan and organize your family's meals."
        >
          <Button variant="ghost" size="sm" onClick={() => setView('home')} disabled={generating}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        {generating ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                Generating your meal plan…
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                This will only take a moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <MealPreferencesForm
            initial={preferences}
            onCancel={() => setView('home')}
            onGenerate={handleGenerate}
          />
        )}
      </AppShell>
    );
  }

  if (view === 'plan' && generatedPlan) {
    return (
      <AppShell>
        <PageHeader
          title="Meal Planner"
          description="Plan and organize your family's meals."
        >
          <Button variant="ghost" size="sm" onClick={handleBackHome}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <MealPlanView
          plan={generatedPlan}
          preferences={preferences}
          planId={activePlanId}
          onRegenerate={handleRegenerate}
          onBack={handleBackHome}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Meal Planner"
        description="Plan and organize your family's meals."
      >
        <Button
          size="sm"
          onClick={() => setView('preferences')}
          disabled={loading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate New Meal Plan
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Meal Plans
            </h2>
          </div>
          {loading ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : savedPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">No meal plans yet</h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  Generate your first meal plan to start organizing your family's weekly menu.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedPlans.map((plan) => {
                const days = (plan.plan_data as { days?: { dayName: string; meals: { type: string }[] }[] }).days ?? [];
                const mealCount = days.reduce(
                  (sum, d) => sum + d.meals.length,
                  0
                );
                const mealTypes = Array.from(
                  new Set(days.flatMap((d) => d.meals.map((m) => m.type)))
                );
                return (
                  <Card
                    key={plan.id}
                    className="group cursor-pointer border-border/60 transition-colors hover:border-primary/40"
                    onClick={() => openSavedPlan(plan)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {plan.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(plan.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label="Plan actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => {
                                  e.stopPropagation();
                                  setDeletingPlan(plan);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {days.length} days
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {mealCount} meals
                        </Badge>
                        {mealTypes.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[10px] font-medium"
                          >
                            {getMealTypeLabel(t)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meal plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlan
                ? `"${deletingPlan.name}" will be permanently removed.`
                : 'This meal plan will be permanently removed.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePlan}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
