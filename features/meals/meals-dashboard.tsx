'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Loader2,
  Sparkles,
  Utensils,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      .order('created_at', { ascending: false })
      .limit(5);

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
    setView('home');
  };

  if (view === 'preferences' || generating) {
    return (
      <AppShell>
        <PageHeader
          title="Meal Planner"
          description="Plan and organize your family's meals."
        />
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
        />
        <MealPlanView
          plan={generatedPlan}
          preferences={preferences}
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

      <div className="space-y-8">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              {savedPlans.length === 0
                ? 'No meal plans yet'
                : 'Ready for your next plan'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {savedPlans.length === 0
                ? "Generate your first meal plan to start organizing your family's weekly menu."
                : 'Create a new plan tailored to your preferences and pantry.'}
            </p>
            <Button
              size="sm"
              className="mt-6"
              onClick={() => setView('preferences')}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New Meal Plan
            </Button>
          </CardContent>
        </Card>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Recent Meal Plans
            </h2>
          </div>
          {savedPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Your generated meal plans will appear here.
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
                  <Card key={plan.id} className="border-border/60">
                    <CardContent className="p-4">
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
    </AppShell>
  );
}
